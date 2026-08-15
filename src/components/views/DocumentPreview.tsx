import { ReminderDialog } from "./ReminderDialog";
import { ShareInvoiceDialog } from "./ShareInvoiceDialog";
import { QRCodeSVG } from "qrcode.react";
import { generateDynamicUpiString } from "../../utils/upiUtils";
import React, { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import { toCanvas } from "html-to-image";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Mail, 
  Share2, 
  Edit3, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText,
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Sun, 
  Moon, 
  QrCode, 
  Check, 
  Send,
  Building,
  DollarSign,
  Briefcase,
  FileSpreadsheet
} from "lucide-react";

interface InvoiceItemState {
  productId: string;
  name: string;
  hsnSacCode: string;
  price: number;
  quantity: number;
  discountAmount: number;
  gstRate: number;
  unit: string;
}

interface InvoiceState {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerGstin: string;
  customerAddress: string;
  customerState: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  dueDate: string;
  placeOfSupply: string;
  items: InvoiceItemState[];
  notes: string;
  terms: string;
  discountGlobal: number;
  status: "paid" | "sent" | "overdue" | "draft";
}

interface DocumentPreviewProps {
  docTitle?: string;
  invoice: InvoiceState;
  activeBusiness: any;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (id: string, number: string) => void;
  onDuplicate: (invoice: InvoiceState) => void;
  onStatusChange: (invoice: InvoiceState, newStatus: "paid" | "sent" | "overdue" | "draft") => void;
}

export function DocumentPreview({
  docTitle = "INVOICE",
  invoice,
  activeBusiness,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange
}: DocumentPreviewProps) {
  const toast = useToast();
  
  // Preview configuration states
  const [zoom, setZoom] = useState<number>(100);
  const [viewMode, setViewMode] = useState<"a4" | "fluid">("a4");
  const [bgTheme, setBgTheme] = useState<"light" | "dark">("light");
  const [isSharing, setIsSharing] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [upiConfig, setUpiConfig] = useState<any>(null);
  const [brandingSettings, setBrandingSettings] = useState<any>(null);
  useEffect(() => {
    if (activeBusiness?.id) {
      import("../../services/businessService").then(m => {
        m.businessServiceUpi.getUpiConfig(activeBusiness.id).then(conf => {
          if (conf && conf.enableUpiPayments) setUpiConfig(conf);
        }).catch(console.error);
        m.businessService.getBrandingSettings(activeBusiness.id).then(brand => {
          if (brand) setBrandingSettings(brand);
        }).catch(console.error);
        
        // dummy block to keep the original regex match if needed:
        m.businessServiceUpi.getUpiConfig(activeBusiness.id).then(conf => {
          if (conf && conf.enableUpiPayments) setUpiConfig(conf);
        }).catch(console.error);
      });
    }
  }, [activeBusiness]);

  const printRef = useRef<HTMLDivElement>(null);

  const themeId = brandingSettings?.invoiceTheme || "modern";
  const getThemeClasses = (theme) => {
    switch (theme) {
      case 'classic': return {
        headerBorder: "border-b-2 border-slate-800 pb-6",
        logoBg: "bg-slate-800 rounded-sm text-white",
        titleColor: "text-slate-800 font-serif",
        accentBadge: "bg-slate-100 text-slate-800 border-slate-300 rounded-sm",
        tableHeader: "bg-slate-100 text-slate-800 border-y-2 border-slate-800",
        highlightText: "text-slate-800",
        totalsBox: "bg-slate-50 border-2 border-slate-800 rounded-sm",
        accentBg: "bg-slate-800"
      };
      case 'minimal': return {
        headerBorder: "border-b border-slate-100 pb-8",
        logoBg: "bg-slate-100 text-slate-900 rounded-full",
        titleColor: "text-slate-900 font-light",
        accentBadge: "bg-transparent text-slate-500 border border-slate-200 rounded-full",
        tableHeader: "border-b border-slate-200 text-slate-500 bg-transparent",
        highlightText: "text-slate-900 font-medium",
        totalsBox: "border-t border-slate-200 bg-transparent",
        accentBg: "bg-slate-900"
      };
      case 'bold': return {
        headerBorder: "border-b-4 pb-6",
        logoBg: "rounded-none text-white",
        titleColor: "font-black tracking-tighter text-slate-900",
        accentBadge: "text-white rounded-none",
        tableHeader: "text-white border-none",
        highlightText: "font-bold text-slate-900",
        totalsBox: "border-l-4 rounded-none bg-slate-50/50",
        accentBg: ""
      };
      case 'compact': return {
        headerBorder: "border-b border-slate-250 pb-3",
        logoBg: "rounded-lg text-white",
        titleColor: "text-slate-900 font-bold tracking-tight",
        accentBadge: "rounded-md",
        tableHeader: "bg-slate-50 border-y border-slate-200 text-slate-600",
        highlightText: "",
        totalsBox: "bg-slate-50/50 rounded-lg border border-slate-200/60",
        accentBg: ""
      };
      case 'modern':
      default: return {
        headerBorder: "border-b border-slate-200 pb-6",
        logoBg: "rounded-xl shadow-sm text-white",
        titleColor: "text-slate-900 font-extrabold tracking-tight",
        accentBadge: "rounded-md",
        tableHeader: "bg-slate-50 border-y border-slate-200 text-slate-600",
        highlightText: "",
        totalsBox: "bg-slate-50 rounded-2xl border border-slate-200/60",
        accentBg: ""
      };
    }
  };
  const themeClasses = getThemeClasses(themeId);
  const cellPadding = themeId === 'compact' ? "p-1.5" : "p-3";


  // Business fallback profiles
  const businessName = activeBusiness?.name || "GATHEX Technologies Pvt Ltd";
  const tradeName = activeBusiness?.tradeName || "GATHEX Systems";
  const businessGstin = activeBusiness?.gstin || "27AAECG8492C1Z2"; // Maharashtra (27)
  const businessAddressStr = activeBusiness?.address 
    ? `${activeBusiness.address.street || ""}, ${activeBusiness.address.city || ""}, ${activeBusiness.address.state || ""} - ${activeBusiness.address.postalCode || ""}`
    : "402, GATHEX Incline Towers, Andheri East, Mumbai, Maharashtra (27) - 400069";
  const businessPhone = activeBusiness?.phone || "+91 99887 76655";
  const businessEmail = activeBusiness?.email || "accounts@gathex.com";
  const businessWebsite = activeBusiness?.website || "https://gathex.com";
  const businessBank = activeBusiness?.bankDetails || {
    accountName: "GATHEX Technologies Pvt Ltd",
    accountNumber: "50200084928192",
    bankName: "HDFC Bank Ltd",
    ifsc: "HDFC0000104",
    branch: "Andheri East, Mumbai"
  };
  const businessUpi = activeBusiness?.upiId || "gathex@hdfcbank";

  // Indian currency formatter
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  // Tax calculations
  const calculateInvoiceMath = (inv: InvoiceState) => {
    let subTotal = 0;
    let totalDiscount = Number(inv.discountGlobal) || 0;
    let totalTaxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    // State code check (first 2 digits)
    const bizStateCode = businessGstin.substring(0, 2);
    const supplyStateMatch = inv.placeOfSupply.match(/\((\d{2})\)/);
    const supplyStateCode = supplyStateMatch ? supplyStateMatch[1] : bizStateCode;
    const isIntrastate = bizStateCode === supplyStateCode;

    const computedItems = (inv.items || []).map(item => {
      const baseSub = item.price * item.quantity;
      const rowTaxable = Math.max(0, baseSub - item.discountAmount);
      
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isIntrastate) {
        cgst = rowTaxable * (item.gstRate / 2) / 100;
        sgst = rowTaxable * (item.gstRate / 2) / 100;
      } else {
        igst = rowTaxable * item.gstRate / 100;
      }

      subTotal += baseSub;
      totalDiscount += item.discountAmount;
      totalTaxableAmount += rowTaxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;

      return {
        ...item,
        rowTaxable,
        cgst,
        sgst,
        igst,
        rowTotal: rowTaxable + cgst + sgst + igst
      };
    });

    const tentativeTotal = totalTaxableAmount + totalCgst + totalSgst + totalIgst - Number(inv.discountGlobal || 0);
    const grandTotal = Math.round(tentativeTotal);
    const roundOff = grandTotal - tentativeTotal;

    return {
      subTotal,
      totalDiscount,
      totalTaxableAmount,
      totalCgst,
      totalSgst,
      totalIgst,
      roundOff,
      grandTotal,
      computedItems
    };
  };

  const math = calculateInvoiceMath(invoice);

  // Number to Indian Words converter
  const numberToWords = (num: number): string => {
    const a = [
      '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
      'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convert(n: number, s: string): string {
      let str = '';
      if (n > 19) {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      } else {
        str += a[n];
      }
      if (n) {
        str += s;
      }
      return str;
    }

    let amount = Math.round(num);
    if (amount === 0) return 'Zero Rupees Only';

    let out = '';
    out += convert(Math.floor(amount / 10000000), 'Crore ');
    out += convert(Math.floor((amount / 100000) % 100), 'Lakh ');
    out += convert(Math.floor((amount / 1000) % 100), 'Thousand ');
    out += convert(Math.floor((amount / 100) % 10), 'Hundred ');
    if (amount > 100 && amount % 100) {
      out += 'and ';
    }
    out += convert(amount % 100, '');
    return out + 'Rupees Only';
  };

  const handlePrint = () => {
    window.print();
  };

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const handleShare = () => {
    setIsShareDialogOpen(true);
  };



  const handleEmail = async () => {
    setIsSendingEmail(true);
    try {
      await handleDownloadPDF();

      const subject = encodeURIComponent(`${docTitle || "Document"} - ${invoice.invoiceNumber} from ${businessName}`);
      const body = encodeURIComponent(`Dear ${invoice.customerName},

Please find attached the ${(docTitle || "Document").toLowerCase()} ${invoice.invoiceNumber} for your reference.

Amount Due: ${formatINR(invoice.items.reduce((acc, item) => acc + (item.quantity * item.price) - item.discountAmount + (item.quantity * item.price * item.gstRate / 100), 0) - invoice.discountGlobal)}
Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}

Thank you for your business.

Best regards,
${businessName}`);

      setTimeout(() => {
        window.location.href = `mailto:${invoice.customerEmail || ""}?subject=${subject}&body=${body}`;
        toast.success("Mail Client Opened", "Drafting email. Please attach the downloaded PDF.");
      }, 500);
    } catch (err) {
      toast.error("Email Failed", "Could not open mail client.");
    } finally {
      setIsSendingEmail(false);
    }
  };




  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    toast.success("Generating PDF", "Rendering high-fidelity document...");
    
    try {
      const canvas = await toCanvas(printRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoice.invoiceNumber || "Document"}.pdf`);
      
      toast.success("PDF Downloaded", "Document saved to your device.");
    } catch (err) {
      console.error(err);
      toast.error("Download Failed", "Failed to generate PDF document.");
    }
  };


  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
            title="Go back to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> Invoice Control Desk
            </h1>
            <p className="text-xs text-slate-500">Preview, execute, or manage dispatch channels for <span className="font-mono font-bold text-indigo-500">{invoice.invoiceNumber}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Back to List
          </Button>
          <Button variant="primary" icon={<Edit3 className="w-4 h-4" />} onClick={onEdit}>
            Edit Invoice
          </Button>
        </div>
      </div>

      {/* Main Preview Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: INVOICE CONTROLS */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="space-y-4 shadow-sm border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Invoice Summary & Action Panel
              </h3>
              <button
                onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
                className="lg:hidden text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg"
              >
                {isControlsCollapsed ? "Expand Panel" : "Collapse Panel"}
              </button>
            </div>

            <div className={isControlsCollapsed ? "hidden lg:block space-y-4" : "space-y-4"}>
              {/* Status Pills */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Classification Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onStatusChange(invoice, "paid")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      invoice.status === "paid"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid Settled
                  </button>
                  <button
                    onClick={() => onStatusChange(invoice, "sent")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      invoice.status === "sent"
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" /> Sent Outward
                  </button>
                  <button
                    onClick={() => onStatusChange(invoice, "overdue")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      invoice.status === "overdue"
                        ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                  </button>
                  <button
                    onClick={() => onStatusChange(invoice, "draft")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      invoice.status === "draft"
                        ? "bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /> Draft Mode
                  </button>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Recipient:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{invoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Value:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">{formatINR(math.grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Outstanding:</span>
                  <span className="font-bold font-mono text-rose-500">
                    {invoice.status === "paid" ? formatINR(0) : formatINR(math.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Principal Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print Document
                  </span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] bg-indigo-500 rounded font-mono">Ctrl+P</kbd>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-indigo-500" /> Export PDF Format
                </button>

                <button
                  onClick={handleEmail}
                  disabled={isSendingEmail}
                  className="w-full flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-4 h-4 text-emerald-500" /> {isSendingEmail ? "Dispatched..." : "Email Outward copy"}
                </button>

                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="w-full flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-sky-500" /> {isSharing ? "Copying link..." : "Copy Web Share URL"}
                </button>
              </div>

              {/* Utility secondary actions */}
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                <button
                  onClick={() => {
                    onDuplicate(invoice);
                    toast.success("Invoice Duplicated", "Created a fresh workspace clone with duplicated parameters.");
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button
                  onClick={() => onDelete(invoice.id, invoice.invoiceNumber)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50/40 hover:bg-rose-50 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Void Permanent
                </button>
              </div>
            </div>
          </Card>

          {/* Quick Payment Details card */}
          <div className={isControlsCollapsed ? "hidden lg:block" : "block"}>
            <Card className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-indigo-500" /> Live Settlement Channels
              </h4>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <p>Dynamic UPI settlements route directly via partner gateways.</p>
                <div className="font-mono text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400">VPA:</span> <span className="font-bold text-indigo-500">{businessUpi}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* RIGHT PANEL: LIVE HIGH-FIDELITY INVOICE PREVIEW */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* ZOOM & VIEW MODE CONTROL ROW */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/80 p-2 rounded-xl backdrop-blur-xs print:hidden">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold font-mono px-2 text-slate-700 dark:text-slate-300">{zoom}%</span>
              <button 
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

              <button 
                onClick={() => setZoom(100)}
                className="px-2 py-1 text-[10px] font-bold rounded-md hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              >
                Fit Page
              </button>
              <button 
                onClick={() => setZoom(120)}
                className="px-2 py-1 text-[10px] font-bold rounded-md hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              >
                Fit Width
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Ratio toggle */}
              <button 
                onClick={() => setViewMode(viewMode === "a4" ? "fluid" : "a4")}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                  viewMode === "a4" 
                    ? "bg-indigo-500 text-white" 
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white"
                }`}
                title="Toggle page height standards"
              >
                {viewMode === "a4" ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                <span>{viewMode === "a4" ? "A4 Paper View" : "Full Page height"}</span>
              </button>

              {/* Theme toggle */}
              <button
                onClick={() => setBgTheme(bgTheme === "light" ? "dark" : "light")}
                className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Toggle Preview Canvas Theme"
              >
                {bgTheme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* DYNAMIC SHADOWED SHEETS WRAPPER */}
          <div 
            className={`w-full overflow-auto rounded-2xl border transition-all duration-300 flex justify-center py-8 px-4 ${
              bgTheme === "light" 
                ? "bg-slate-50 border-slate-200/50" 
                : "bg-slate-950 border-slate-900/50"
            }`}
          >
            {/* INVOICE PAPER BODY */}
            <div 
              ref={printRef}
              id="invoice-print-container"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
              className={`w-full bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-200/60 transition-all print:shadow-none print:border-none print:transform-none ${
                themeId === 'classic' ? 'font-serif' : 'font-sans'
              } ${
                viewMode === "a4" 
                  ? (themeId === 'compact' ? "max-w-[794px] min-h-[1123px] p-6 md:p-8" : "max-w-[794px] min-h-[1123px] p-10 md:p-14") 
                  : (themeId === 'compact' ? "p-4 md:p-6" : "p-6 md:p-10")
              }`}
            >
              
              {/* HEADER CONTAINER */}
              <div className={`flex flex-col md:flex-row justify-between items-start gap-6 ${themeClasses.headerBorder}`}
                   style={{ borderBottomColor: themeId === "bold" ? (brandingSettings?.invoiceAccentColor || "#4f46e5") : undefined }}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className={`h-10 w-10 flex items-center justify-center font-black text-lg tracking-tight ${themeClasses.logoBg}`}
                      style={{ backgroundColor: (themeId !== 'classic' && themeId !== 'minimal' && brandingSettings?.invoiceAccentColor) ? brandingSettings.invoiceAccentColor : undefined }}
                    >
                      {businessName.charAt(0)}
                    </div>
                    <div>
                      <h2 className={`text-base leading-tight ${themeClasses.titleColor}`}>{businessName}</h2>
                      {tradeName && <p className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">{tradeName}</p>}
                    </div>
                  </div>
 
                  <div className="space-y-1 text-xs text-slate-500 leading-normal max-w-sm">
                    <p className="font-semibold text-slate-700">{businessAddressStr}</p>
                    <p>Phone: <span className="font-semibold">{businessPhone}</span> | Email: <span className="font-semibold">{businessEmail}</span></p>
                    {businessWebsite && <p>Website: <span className="font-semibold text-indigo-500">{businessWebsite}</span></p>}
                    <p 
                      className={`font-mono font-extrabold text-xs mt-1.5 uppercase ${themeClasses.highlightText}`}
                      style={{ color: (themeId !== 'classic' && themeId !== 'minimal' && brandingSettings?.invoiceAccentColor) ? brandingSettings.invoiceAccentColor : undefined }}
                    >
                      GSTIN: {businessGstin}
                    </p>
                  </div>
                </div>
 
                <div className="text-left md:text-right space-y-2">
                  <span 
                    className={`inline-block px-2 py-0.5 font-black tracking-widest text-[10px] uppercase ${themeClasses.accentBadge}`}
                    style={{ 
                      backgroundColor: (themeId === 'bold' && brandingSettings?.invoiceAccentColor) ? brandingSettings.invoiceAccentColor : (themeId !== 'classic' && themeId !== 'minimal' && brandingSettings?.invoiceAccentColor) ? `${brandingSettings.invoiceAccentColor}15` : undefined,
                      color: (themeId === 'bold' && brandingSettings?.invoiceAccentColor) ? '#ffffff' : (themeId !== 'classic' && themeId !== 'minimal' && brandingSettings?.invoiceAccentColor) ? brandingSettings.invoiceAccentColor : undefined
                    }}
                  >
                    Tax Invoice Document
                  </span>
                  
                  <div className="space-y-1">
                    <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">INVOICE NUMBER</h3>
                    <h1 className="text-lg font-mono font-black text-slate-900 tracking-tight">{invoice.invoiceNumber}</h1>
                  </div>

                  <div className="grid grid-cols-2 md:block gap-x-4 gap-y-1 pt-2 text-xs text-slate-500 space-y-1">
                    <p><span className="font-semibold text-slate-400 md:inline-block md:w-20">Date:</span> {invoice.date}</p>
                    <p className="text-rose-600 font-semibold"><span className="font-semibold text-slate-400 md:inline-block md:w-20">Due Date:</span> {invoice.dueDate}</p>
                    <p><span className="font-semibold text-slate-400 md:inline-block md:w-20">Supply State:</span> {invoice.placeOfSupply}</p>
                    
                    <div className="mt-2 md:text-right">
                      {invoice.status === "paid" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[9px] uppercase tracking-wider rounded-md border border-emerald-100">
                          ● Fully Settled
                        </span>
                      )}
                      {invoice.status === "sent" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[9px] uppercase tracking-wider rounded-md border border-indigo-100">
                          ● Outstanding
                        </span>
                      )}
                      {invoice.status === "overdue" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[9px] uppercase tracking-wider rounded-md border border-rose-100">
                          ● Overdue Account
                        </span>
                      )}
                      {invoice.status === "draft" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 font-extrabold text-[9px] uppercase tracking-wider rounded-md border border-slate-200">
                          ● Draft Mode
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RECIPIENT & TRANSPORT DETAILS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 py-6 text-xs text-slate-600 leading-relaxed">
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Bill To / Recipient</h5>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{invoice.customerName}</p>
                    <p className="mt-1 text-slate-500 leading-normal max-w-xs">{invoice.customerAddress}</p>
                    <p className="mt-1 text-slate-500">Phone: {invoice.customerPhone || "N/A"}</p>
                    <p className="text-slate-500">Email: {invoice.customerEmail || "N/A"}</p>
                    {invoice.customerGstin && (
                      <p className="font-mono font-extrabold text-indigo-600 uppercase mt-1.5">GSTIN: {invoice.customerGstin}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Ship To / Consignee</h5>
                  <div>
                    <p className="font-extrabold text-slate-800">{invoice.customerName}</p>
                    <p className="mt-1 text-slate-500 leading-normal max-w-xs">{invoice.customerAddress}</p>
                    <p className="text-slate-400 italic text-[10px] mt-1">Inter-state transportation handled by partner freight logistics.</p>
                  </div>
                </div>
              </div>

              {/* ITEMS TABLE */}
              <div className={`overflow-x-auto ${themeId === 'compact' ? 'py-2' : 'py-6'}`}>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr 
                      className={`font-bold uppercase tracking-wider ${themeClasses.tableHeader}`}
                      style={{ 
                        backgroundColor: (themeId === 'bold' && brandingSettings?.invoiceAccentColor) ? brandingSettings.invoiceAccentColor : undefined,
                        color: (themeId === 'bold' && brandingSettings?.invoiceAccentColor) ? '#ffffff' : undefined
                      }}
                    >
                      <th className={`${cellPadding} text-center w-10`}>#</th>
                      <th className={`${cellPadding} min-w-[200px]`}>Goods / Services Description</th>
                      <th className={`${cellPadding} text-center`}>HSN/SAC</th>
                      <th className={`${cellPadding} text-right`}>Unit Price</th>
                      <th className={`${cellPadding} text-center`}>Qty</th>
                      <th className={`${cellPadding} text-right`}>Discount</th>
                      <th className={`${cellPadding} text-center`}>GST</th>
                      <th className={`${cellPadding} text-right`}>Tax Amount</th>
                      <th className={`${cellPadding} text-right`}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {math.computedItems.map((item, index) => {
                      const rowTax = item.cgst + item.sgst + item.igst;
                      return (
                        <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                          <td className={`${cellPadding} text-center text-slate-400 font-mono`}>{index + 1}</td>
                          <td className={cellPadding}>
                            <div className="font-bold text-slate-900">{item.name}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">Compliant supply of domestic service/goods</div>
                          </td>
                          <td className={`${cellPadding} text-center font-mono font-bold text-slate-500`}>{item.hsnSacCode || "—"}</td>
                          <td className={`${cellPadding} text-right font-mono`}>{formatINR(item.price)}</td>
                          <td className={`${cellPadding} text-center font-mono`}>{item.quantity} <span className="text-[10px] text-slate-400">{item.unit}</span></td>
                          <td className={`${cellPadding} text-right font-mono text-rose-500`}>
                            {item.discountAmount > 0 ? `-${formatINR(item.discountAmount)}` : "—"}
                          </td>
                          <td className={`${cellPadding} text-center font-mono text-emerald-600 font-extrabold`}>{item.gstRate}%</td>
                          <td className={`${cellPadding} text-right font-mono font-semibold`} style={{ color: brandingSettings?.invoiceAccentColor || '#6366f1' }}>
                            {rowTax > 0 ? formatINR(rowTax) : "—"}
                          </td>
                          <td className={`${cellPadding} text-right font-mono font-bold text-slate-900`}>{formatINR(item.rowTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* SUMMARY SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start border-t border-slate-200 pt-6 text-xs text-slate-600">
                
                {/* Financial and settlement banks */}
                <div className="md:col-span-7 space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2">
                    <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" /> Settling Bank & Remittance Instructions
                    </h4>
                    <div className="grid grid-cols-3 gap-y-1.5 text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-400">Bank Name:</span>
                      <span className="col-span-2 font-bold text-slate-800">{businessBank.bankName}</span>
                      
                      <span className="font-semibold text-slate-400">Account No:</span>
                      <span className="col-span-2 font-mono font-bold text-slate-800">{businessBank.accountNumber}</span>
                      
                      <span className="font-semibold text-slate-400">IFSC Code:</span>
                      <span className="col-span-2 font-mono font-bold text-indigo-600">{businessBank.ifsc}</span>
                      
                      <span className="font-semibold text-slate-400">Account Name:</span>
                      <span className="col-span-2 font-bold text-slate-800">{businessBank.accountName}</span>
                    </div>
                  </div>

                  {/* Amount in Words */}
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Value Amount in Words</h5>
                    <p className="text-[11px] text-slate-700 font-black uppercase tracking-tight italic">
                      {numberToWords(math.grandTotal)}
                    </p>
                  </div>
                </div>
                  {upiConfig && upiConfig.enableUpiPayments && upiConfig.primaryUpiId && (
                    <div className="p-4 bg-white rounded-xl border border-slate-200 flex gap-4 items-center">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 shrink-0">
                        <QRCodeSVG 
                          value={generateDynamicUpiString(invoice as any, upiConfig) || ""} 
                          size={upiConfig.qrDisplaySize || 100} 
                          level="M" 
                          includeMargin={false} 
                        />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5 text-indigo-600" /> Scan to Pay
                        </h4>
                        <p className="text-[10px] text-slate-500">Scan using Google Pay, PhonePe, Paytm, BHIM, or any UPI app to settle this invoice.</p>
                        <p className="text-[10px] font-mono font-bold text-indigo-600 mt-1">{upiConfig.primaryUpiId}</p>
                      </div>
                    </div>
                  )}

                  {/* Subtotals & Taxes calculation breakdown */}
                <div 
                  className={`md:col-span-5 space-y-2 text-[11px] text-slate-500 p-4 ${themeClasses.totalsBox}`}
                  style={{ 
                    borderLeftColor: (themeId === 'bold' && brandingSettings?.invoiceAccentColor) ? brandingSettings.invoiceAccentColor : undefined,
                    backgroundColor: (themeId === 'bold' && brandingSettings?.invoiceAccentColor) ? `${brandingSettings.invoiceAccentColor}08` : undefined
                  }}
                >
                  <div className="flex justify-between">
                    <span>Pre-tax Base Value:</span>
                    <span className="font-mono font-semibold text-slate-800">{formatINR(math.subTotal)}</span>
                  </div>
                  {math.totalDiscount > 0 && (
                    <div className="flex justify-between text-rose-500">
                      <span>Total Item Discounts:</span>
                      <span className="font-mono">-{formatINR(math.totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                    <span>GST Taxable Supplies Value:</span>
                    <span className="font-mono">{formatINR(math.totalTaxableAmount)}</span>
                  </div>
                  
                  {/* GST breakdowns */}
                  {math.totalCgst > 0 && (
                    <div className="flex justify-between font-semibold" style={{ color: brandingSettings?.invoiceAccentColor || '#4f46e5' }}>
                      <span>Central Tax (CGST):</span>
                      <span className="font-mono">{formatINR(math.totalCgst)}</span>
                    </div>
                  )}
                  {math.totalSgst > 0 && (
                    <div className="flex justify-between font-semibold" style={{ color: brandingSettings?.invoiceAccentColor || '#4f46e5' }}>
                      <span>State Tax (SGST):</span>
                      <span className="font-mono">{formatINR(math.totalSgst)}</span>
                    </div>
                  )}
                  {math.totalIgst > 0 && (
                    <div className="flex justify-between font-semibold" style={{ color: brandingSettings?.invoiceAccentColor || '#4f46e5' }}>
                      <span>Integrated Tax (IGST):</span>
                      <span className="font-mono">{formatINR(math.totalIgst)}</span>
                    </div>
                  )}
                  
                  {math.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>Decimal Round-off Adjustment:</span>
                      <span className="font-mono">{math.roundOff > 0 ? "+" : ""}{math.roundOff.toFixed(2)}</span>
                    </div>
                  )}
 
                  {/* Highlights grand total */}
                  <div 
                    className="flex justify-between font-black text-sm border-t border-slate-200 pt-3"
                    style={{ color: brandingSettings?.invoiceAccentColor || '#4338ca' }}
                  >
                    <span className="text-slate-900 font-display font-extrabold uppercase tracking-wide">GRAND TOTAL PAYABLE:</span>
                    <span className="font-mono text-[15px]">{formatINR(math.grandTotal)}</span>
                  </div>

                  {/* Payment history indicators */}
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-400 font-medium">
                    <span>Payment Received / Adjusted:</span>
                    <span className="font-mono text-slate-600">
                      {invoice.status === "paid" ? formatINR(math.grandTotal) : formatINR(0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-950 pb-2">
                    <span>NET BALANCE DUE:</span>
                    <span className="font-mono text-rose-600">
                      {invoice.status === "paid" ? formatINR(0) : formatINR(math.grandTotal)}
                    </span>
                  </div>

                  {/* Dynamic Settlement QR container */}
                  <div className="border border-slate-200/60 rounded-xl p-3 bg-slate-50 flex items-center justify-between gap-4 mt-4 print:hidden">
                    <div className="space-y-1">
                      <h5 className="font-bold text-indigo-900 uppercase tracking-wider text-[9px] flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5" /> GATHEX UPI Quick Pay
                      </h5>
                      <p className="text-[8.5px] text-slate-400 leading-normal max-w-[140px]">
                        Scan to route instant payments through UPI applications securely.
                      </p>
                      <p className="font-mono text-[8px] font-bold text-slate-500">{businessUpi}</p>
                    </div>
                    <div className="p-1 bg-white rounded-lg border border-slate-200">
                      <div className="h-14 w-14 border border-slate-950 rounded flex items-center justify-center p-0.5">
                        <div className="grid grid-cols-4 gap-1 h-full w-full opacity-90">
                          <div className="bg-slate-950 rounded-xs" />
                          <div className="bg-slate-950 rounded-xs" />
                          <div className="bg-transparent" />
                          <div className="bg-slate-950 rounded-xs" />
                          <div className="bg-slate-950 rounded-xs" />
                          <div className="bg-transparent" />
                          <div className="bg-slate-950 rounded-xs" />
                          <div className="bg-transparent" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* NOTES & TERMS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 mt-8 pt-6 text-[10px] text-slate-400 leading-relaxed">
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-700">Remarks & Invoice Notes:</h5>
                  <p className="whitespace-pre-line text-[9.5px] text-slate-500">{invoice.notes || "No remarks entered."}</p>
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-700">Compliance Terms & Conditions:</h5>
                  <p className="whitespace-pre-line text-[9.5px] text-slate-500">{invoice.terms || "Standard business terms apply."}</p>
                </div>
              </div>

              {/* DECLARATION & SIGNATURE ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 pt-6 border-t border-slate-100 text-[10px] text-slate-500">
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-700">Business Declarations:</h5>
                  <p className="leading-relaxed text-[9px] max-w-sm text-slate-400">
                    We hereby declare that this invoice is prepared in compliance with GST Rules and contains accurate descriptions, prices, and classifications of supplies. No modifications are valid unless countersigned.
                  </p>
                </div>
                <div className="md:text-right flex flex-col justify-between h-24 items-end">
                  <div className="text-right">
                    <p className="font-bold text-slate-700">for <span className="text-slate-900 font-extrabold">{businessName}</span>:</p>
                    <p className="text-[8px] text-slate-400 tracking-wider">LEGAL CORPORATE SEAL</p>
                  </div>
                  
                  {/* Script/Vector Signature Representation */}
                  <div className="flex flex-col items-center">
                    <div className="h-8 font-serif italic text-indigo-600 text-lg font-bold select-none pr-4">
                      {businessName.substring(0, 12)}...
                    </div>
                    <div className="border-t border-slate-200 w-44 pt-1 text-center font-bold text-slate-400 uppercase tracking-widest text-[8px]">
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="border-t border-slate-100 mt-12 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-[9px] text-slate-400 font-medium">
                <p>Thank you for partnering with GATHEX Invoice.</p>
                <p className="text-slate-300">Generated & Sourced securely via GATHEX Enterprise Node.</p>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 p-3 flex lg:hidden justify-around items-center gap-2 backdrop-blur-md shadow-2xl print:hidden">
        <button 
          onClick={handlePrint} 
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <Printer className="w-5 h-5 text-indigo-500" />
          <span className="text-[10px] font-bold">Print</span>
        </button>
        <button 
          onClick={handleDownloadPDF} 
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <Download className="w-5 h-5 text-indigo-500" />
          <span className="text-[10px] font-bold">PDF</span>
        </button>
        <button 
          onClick={handleEmail} 
          disabled={isSendingEmail}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
        >
          <Mail className="w-5 h-5 text-emerald-500" />
          <span className="text-[10px] font-bold">{isSendingEmail ? "Sending" : "Email"}</span>
        </button>
        <button 
          onClick={handleShare} 
          disabled={isSharing}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-sky-600 transition-colors cursor-pointer"
        >
          <Share2 className="w-5 h-5 text-sky-500" />
          <span className="text-[10px] font-bold">{isSharing ? "Copying" : "Share"}</span>
        </button>
        <button 
          onClick={onEdit} 
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
        >
          <Edit3 className="w-5 h-5 text-amber-500" />
          <span className="text-[10px] font-bold">Edit</span>
        </button>
            <ReminderDialog isOpen={isReminderOpen} onClose={() => setIsReminderOpen(false)} invoice={invoice as any} />
            <ShareInvoiceDialog isOpen={isShareDialogOpen} onClose={() => setIsShareDialogOpen(false)} invoice={invoice as any} />
</div>
    </div>
  );
}
