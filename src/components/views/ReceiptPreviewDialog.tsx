import React, { useRef, useState, useEffect } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Payment, PaymentReceipt } from "../../types";
import { Download, Printer, Share2, Mail, Loader2 } from "lucide-react";
import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { useToast } from "../ui/Toast";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase/config";
import { ReceiptDocument } from "./receipts/ReceiptDocument";
import { ShareReceiptDialog } from "./receipts/ShareReceiptDialog";
import { EmailReceiptDialog } from "./receipts/EmailReceiptDialog";
import { addReceiptLog, logReceiptDownload, mapReceiptRow } from "../../services/receiptService";

interface ReceiptPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
}

export function ReceiptPreviewDialog({ isOpen, onClose, payment }: ReceiptPreviewDialogProps) {
  const toast = useToast();
  const { user, activeBusiness } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Sharing/Emailing states
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  useEffect(() => {
    if (isOpen && payment && activeBusiness) {
      loadReceipt();
    } else {
      setReceipt(null);
    }
  }, [isOpen, payment, activeBusiness]);

  const loadReceipt = async () => {
    if (!payment || !activeBusiness) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('id', payment.id)
        .maybeSingle();

      if (!error && data) {
        setReceipt(mapReceiptRow(data));
      } else {
        // Fallback for older historical payments: form a compatible PaymentReceipt mockup
        const cleanAddress = (addr: any) => {
          if (!addr) return undefined;
          return {
            street: addr.street || "",
            city: addr.city || "",
            state: addr.state || "",
            postalCode: addr.postalCode || "",
            country: addr.country || "India"
          };
        };

        const mockReceipt: PaymentReceipt = {
          id: payment.id,
          receiptNumber: `RCT-${new Date(payment.paymentDate).getFullYear()}-${payment.id.substring(0,6).toUpperCase()}`,
          businessId: payment.businessId,
          customerId: payment.customerId,
          invoiceId: payment.invoiceId,
          paymentId: payment.id,
          userId: payment.ownerUid || user?.uid || "",
          receiptDate: payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate),
          status: payment.status === 'cancelled' ? 'cancelled' : payment.status === 'refunded' ? 'refunded' : 'paid',
          amountPaid: payment.amount,
          currency: payment.currency || "INR",
          businessDetails: {
            name: activeBusiness.name,
            logoUrl: activeBusiness.logoUrl || undefined,
            gstin: activeBusiness.gstin || undefined,
            address: cleanAddress(activeBusiness.address),
            email: activeBusiness.email,
            phone: activeBusiness.phone,
            website: activeBusiness.website || undefined
          },
          customerDetails: {
            name: payment.customerName,
            email: (payment as any).customerEmail || undefined
          },
          paymentDetails: {
            invoiceNumber: payment.invoiceNumber,
            paymentDate: payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate),
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId || undefined,
            referenceNumber: payment.referenceNumber || undefined,
            collectedBy: payment.recordedBy || undefined
          },
          summary: {
            invoiceTotal: payment.amount,
            previousBalance: payment.amount,
            amountPaid: payment.amount,
            remainingBalance: 0
          },
          notes: payment.notes || undefined,
          token: "legacy-reconstructed-receipt",
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Inject payment-specific detail maps for historical view compatibility
        const method = payment.paymentMethod.toLowerCase();
        if (method === 'upi') {
          mockReceipt.paymentDetails.upi = {
            upiId: activeBusiness.upiId || "UPI",
            transactionId: payment.transactionId || ""
          };
        } else if (method === 'bank_transfer') {
          mockReceipt.paymentDetails.bankTransfer = {
            bankName: activeBusiness.bankDetails?.bankName || "Bank Wire",
            utrNumber: payment.transactionId || payment.referenceNumber || ""
          };
        } else if (method === 'cash') {
          mockReceipt.paymentDetails.cash = {
            receivedBy: activeBusiness.name
          };
        }

        setReceipt(mockReceipt);
      }
    } catch (e) {
      console.error("Error loading specific payment receipt:", e);
      toast.error("Receipt Load Error", "Could not synchronize receipt ledger details.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!receipt) return;
    try {
      await addReceiptLog(receipt.id, receipt.businessId, 'printed', user?.uid, 'business');
      window.print();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current || !receipt) return;
    setDownloading(true);
    toast.success("Generating Receipt PDF", "Compiling high-fidelity graphics layout...");
    
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
      pdf.save(`Receipt_${receipt.receiptNumber}.pdf`);
      
      await logReceiptDownload(receipt.id, receipt.businessId, 'business');
      toast.success("Download Complete", "Receipt document saved successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Download Failed", "Failed to compile the vector PDF canvas.");
    } finally {
      setDownloading(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Payment Receipt Viewer" size="xl">
      <div className="space-y-6 pt-2">
        
        {/* Action bar (hides when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Active Document</span>
            <span className="text-sm font-extrabold text-slate-800 dark:text-white font-mono">{receipt?.receiptNumber || "RCT-PENDING"}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={handlePrint} 
              disabled={loading || !receipt}
              className="font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs gap-1 px-4"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDownloadPDF} 
              disabled={loading || downloading || !receipt}
              className="font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs gap-1 px-4"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Rendering...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download PDF
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsEmailOpen(true)} 
              disabled={loading || !receipt}
              className="font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs gap-1 px-4"
            >
              <Mail className="w-4 h-4" /> Email Customer
            </Button>
            <Button 
              variant="primary" 
              onClick={() => setIsShareOpen(true)} 
              disabled={loading || !receipt}
              className="font-bold text-xs gap-1 px-4"
            >
              <Share2 className="w-4 h-4" /> Share Receipt
            </Button>
          </div>
        </div>

        {/* Receipt Canvas Wrapper */}
        <div className="max-h-[650px] overflow-y-auto p-2 bg-slate-100 dark:bg-slate-950/60 rounded-3xl border border-slate-200/50 dark:border-slate-800/80">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compiling Receipt Ledger...</p>
            </div>
          ) : receipt ? (
            <div ref={printRef} className="print:m-0 print:p-0">
              <ReceiptDocument receipt={receipt} />
            </div>
          ) : (
            <div className="py-32 text-center text-slate-400">
              <p className="font-semibold text-sm">Receipt ledger not generated.</p>
            </div>
          )}
        </div>

        {/* Embedded sharing and emailing modall hooks */}
        {receipt && (
          <>
            <ShareReceiptDialog 
              isOpen={isShareOpen} 
              onClose={() => setIsShareOpen(false)} 
              receipt={receipt} 
            />
            <EmailReceiptDialog 
              isOpen={isEmailOpen} 
              onClose={() => setIsEmailOpen(false)} 
              receipt={receipt} 
            />
          </>
        )}

      </div>
    </Dialog>
  );
}
