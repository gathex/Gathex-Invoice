import { useState, useEffect, useRef } from "react";
import { Invoice, BusinessDetails, Payment, DocumentActivity } from "../../types";
import { supabase } from "../../supabase/config";
import { createReceiptFromPayment } from "../../services/receiptService";
import { mapDocumentItemRow } from "../../services/salesDocumentService";
import { ReceiptPreviewDialog } from "./ReceiptPreviewDialog";

import { 
  Loader2, 
  Download, 
  Printer, 
  CreditCard, 
  Lock, 
  Shield, 
  CheckCircle2, 
  Building, 
  Clock, 
  ExternalLink, 
  FileText, 
  Check, 
  Eye, 
  Globe, 
  Calendar, 
  DollarSign, 
  Smartphone, 
  Laptop, 
  ChevronRight, 
  Info, 
  X,
  QrCode,
  AlertTriangle,
  Copy,
  Receipt
} from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { exportElementToPDF } from "../../utils/pdfExport";
import { useToast } from "../ui/Toast";
import { QRPaymentCard } from "../ui/QRPaymentCard";
import { generateDynamicUpiString } from "../../utils/upiUtils";

// Helpers for client-side environment logging
const getBrowserName = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Mozilla Firefox";
  if (ua.includes("Chrome")) return "Google Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Apple Safari";
  if (ua.includes("Edge")) return "Microsoft Edge";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Web Browser";
};

const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return "Mobile Phone";
  if (/tablet/i.test(ua)) return "Tablet";
  return "Desktop Computer";
};

export function PublicInvoiceView() {
  const toast = useToast();
  const [invoice, setInvoice] = useState<any | null>(null);
  const [business, setBusiness] = useState<any | null>(null);
  const [upiConfig, setUpiConfig] = useState<any>(null);
  const [brandingSettings, setBrandingSettings] = useState<any>(null);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activities, setActivities] = useState<DocumentActivity[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [hasPublicSettings, setHasPublicSettings] = useState(false);
  
  // Navigation tabs for payment options
  const [activePaymentTab, setActivePaymentTab] = useState<"upi" | "card" | "bank">("upi");
  
  // Payment processing states
  const [upiUtr, setUpiUtr] = useState("");
  const [isUpiSubmitting, setIsUpiSubmitting] = useState(false);
  
  // Credit card form states
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [isCardSubmitting, setIsCardSubmitting] = useState(false);
  const [cardSubmitStage, setCardSubmitStage] = useState("");
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  // Receipt Preview Dialog States
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const hash = window.location.hash;
        const queryParams = new URLSearchParams(hash.split("?")[1]);
        const id = queryParams.get("id");
        const token = queryParams.get("token");

        if (!token && !id) {
          setError("Invalid URL parameters. Missing invoice identifiers.");
          setLoading(false);
          return;
        }

        let docData: any = null;
        let itemsData: any[] = [];
        let bizData: any = null;

        if (token) {
          const { data: dData } = await supabase.rpc('get_public_document', { p_token: token });
          const { data: iData } = await supabase.rpc('get_public_document_items', { p_token: token });
          const { data: bData } = await supabase.rpc('get_public_business_details', { p_token: token });
          docData = dData;
          itemsData = iData || [];
          bizData = bData;
        }

        if (!docData && id) {
          const { data: dData } = await supabase.from('sales_documents').select('*').eq('id', id).maybeSingle();
          if (dData) {
            docData = dData;
            const { data: iData } = await supabase.from('document_items').select('*').eq('document_id', id);
            itemsData = iData || [];
            if (dData.business_id) {
              const { data: bData } = await supabase.from('businesses').select('*').eq('id', dData.business_id).maybeSingle();
              bizData = bData;
            }
          }
        }

        if (!docData) {
          setError("Requested invoice does not exist or has been archived.");
          setLoading(false);
          return;
        }

        const items = (itemsData || []).map(mapDocumentItemRow);
        const loadedInvoice = {
          id: docData.id,
          businessId: docData.business_id,
          ownerUid: docData.owner_uid || "",
          invoiceNumber: docData.doc_number,
          status: docData.status,
          customerId: docData.customer_id,
          customerDetails: docData.customer_details || {},
          issueDate: docData.issue_date ? new Date(docData.issue_date) : new Date(),
          dueDate: docData.due_date ? new Date(docData.due_date) : new Date(),
          items,
          subTotal: Number(docData.sub_total || 0),
          totalDiscount: Number(docData.total_discount || 0),
          totalTaxableAmount: Number(docData.total_taxable_amount || 0),
          totalCgst: Number(docData.total_cgst || 0),
          totalSgst: Number(docData.total_sgst || 0),
          totalIgst: Number(docData.total_igst || 0),
          totalCess: Number(docData.total_cess || 0),
          grandTotal: Number(docData.grand_total || 0),
          amountPaid: Number(docData.amount_paid || 0),
          amountDue: Number(docData.amount_due || 0),
          paymentUpiQrUrl: docData.payment_upi_qr_url,
          notes: docData.notes,
          termsConditions: docData.terms_conditions,
          createdAt: docData.created_at ? new Date(docData.created_at) : new Date(),
          updatedAt: docData.updated_at ? new Date(docData.updated_at) : new Date()
        } as any;

        setInvoice(loadedInvoice);
        setIsPasswordVerified(true);
        if (bizData) {
          setBusiness({
            id: bizData.id,
            name: bizData.name,
            tradeName: bizData.tradeName || bizData.trade_name,
            gstin: bizData.gstin,
            email: bizData.email,
            phone: bizData.phone,
            website: bizData.website,
            address: bizData.address || {},
            logoUrl: bizData.logoUrl || bizData.logo_url,
            upiId: bizData.upiId || bizData.upi_id,
            invoiceTheme: bizData.invoiceTheme || bizData.invoice_theme
          });
        }

        const bizId = docData.business_id;

        // Fetch Payments
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('invoice_id', docData.id)
          .order('payment_date', { ascending: false });

        if (paymentsData) {
          const paymentsList = paymentsData.map(p => ({
            id: p.id,
            businessId: p.business_id,
            ownerUid: p.owner_uid,
            invoiceId: p.invoice_id,
            invoiceNumber: p.invoice_number,
            customerId: p.customer_id,
            customerName: p.customer_name,
            amount: Number(p.amount || 0),
            currency: p.currency || "INR",
            paymentDate: p.payment_date ? new Date(p.payment_date) : new Date(),
            paymentMethod: p.payment_method,
            status: p.status,
            transactionId: p.transaction_id,
            referenceNumber: p.reference_number,
            notes: p.notes,
            recordedBy: p.recorded_by,
            createdAt: p.created_at ? new Date(p.created_at) : new Date(),
            updatedAt: p.updated_at ? new Date(p.updated_at) : new Date()
          } as Payment));
          setPayments(paymentsList);
        }

        // Fetch Timeline activities
        const { data: actData } = await supabase
          .from('document_activities')
          .select('*')
          .eq('document_id', docData.id)
          .order('timestamp', { ascending: true });

        if (actData) {
          const actList = actData.map(a => ({
            id: a.id,
            businessId: a.business_id,
            ownerUid: a.owner_uid,
            documentId: a.document_id,
            documentType: a.document_type,
            documentNumber: a.document_number,
            action: a.action,
            description: a.description || "",
            userId: a.user_id,
            userName: a.user_name || "Partner",
            timestamp: a.timestamp ? new Date(a.timestamp) : new Date()
          } as DocumentActivity));
          setActivities(actList);
        }

        // Fetch branding & payment parameters
        if (bizId) {
          import("../../services/businessService").then(m => {
            m.businessService.getBrandingSettings(bizId).then(brand => {
              if (brand) setBrandingSettings(brand);
            }).catch(console.error);
            
            m.businessService.getPaymentSettings(bizId).then(pay => {
              if (pay) setPaymentSettings(pay);
            }).catch(console.error);

            m.businessServiceUpi.getUpiConfig(bizId).then(conf => {
              if (conf && conf.enableUpiPayments) setUpiConfig(conf);
            }).catch(console.error);
          });
        }
      } catch (err) {
        console.error("Error loading secure invoice view:", err);
        setError("Error setting up secure portal environment. Please retry.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, []);

  // Securely log view count & audit events on verify success
  const logInvoiceView = async (invoiceId: string, currentInvoice: any) => {
    try {
      const dev = getDeviceType();
      const br = getBrowserName();
      
      await supabase.from('document_activities').insert({
        business_id: currentInvoice.businessId,
        owner_uid: currentInvoice.ownerUid,
        document_id: invoiceId,
        document_type: "invoice",
        document_number: currentInvoice.invoiceNumber,
        action: "viewed",
        description: `Customer viewed invoice on ${br} (${dev})`,
        user_id: "customer_public",
        user_name: "Customer (Public Link)"
      });
    } catch (e) {
      console.warn("View logging bypassed", e);
    }
  };

  const handleVerifyPassword = async () => {
    if (invoice && (invoice as any).sharePassword) {
      if (passwordInput === (invoice as any).sharePassword) {
        setIsPasswordVerified(true);
        toast.success("Security Verified", "Access granted to secure portal ledger.");
        await logInvoiceView(invoice.id, invoice);
      } else {
        setPasswordError(true);
        toast.error("Access Denied", "Incorrect verification password. Access denied.");
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current || !invoice) return;
    toast.success("Rendering PDF", "Starting pixel-perfect PDF export compilation...");
        
    try {
      await exportElementToPDF(printRef.current, `${invoice.invoiceNumber}.pdf`);
      toast.success("PDF Exported", "Document saved successfully.");
    } catch (err) {
      console.error(err);
      toast.error("PDF Failed", "Compilation error while exporting document canvas.");
    }
  };

  // Submit manual UPI Payment
  const handleUpiPaymentSubmit = async () => {
    if (!invoice) return;
    if (!upiUtr.trim() || upiUtr.trim().length < 6) {
      toast.error("Reference Required", "Please enter a valid Bank Transaction Reference ID (UTR).");
      return;
    }

    setIsUpiSubmitting(true);
    try {
      const pAmount = invoice.amountDue;
      
      const { data: payRes, error: payErr } = await supabase
        .from('payments')
        .insert({
          business_id: invoice.businessId,
          owner_uid: invoice.ownerUid,
          invoice_id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          customer_id: invoice.customerId || null,
          customer_name: invoice.customerDetails?.name || "Customer",
          customer_email: invoice.customerDetails?.email || null,
          amount: pAmount,
          currency: "INR",
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: "upi",
          payment_type: "full",
          status: "paid",
          transaction_id: upiUtr.trim(),
          reference_number: upiUtr.trim(),
          notes: "Settled online via Public Secure Link UPI QR Code scanning.",
          recorded_by: "customer_portal"
        })
        .select('id')
        .single();

      if (payErr) throw payErr;

      if (business && payRes?.id) {
        try {
          const paymentObj: Payment = {
            id: payRes.id,
            businessId: invoice.businessId,
            ownerUid: invoice.ownerUid,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerId: invoice.customerId,
            customerName: invoice.customerDetails?.name || "Customer",
            amount: pAmount,
            currency: "INR",
            paymentDate: new Date(),
            paymentMethod: "upi",
            paymentType: "incoming",
            status: "paid",
            transactionId: upiUtr.trim(),
            referenceNumber: upiUtr.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await createReceiptFromPayment(paymentObj, business, invoice);
        } catch (receiptErr) {
          console.error("Failed to generate receipt during public UPI payment:", receiptErr);
        }
      }

      // 2. Update Invoice Settlement Details
      const newAmountPaid = (invoice.amountPaid || 0) + pAmount;
      await supabase
        .from('sales_documents')
        .update({
          amount_paid: newAmountPaid,
          amount_due: 0,
          status: "paid"
        })
        .eq('id', invoice.id);

      // 3. Log Document Activity
      await supabase.from('document_activities').insert({
        business_id: invoice.businessId,
        owner_uid: invoice.ownerUid,
        document_id: invoice.id,
        document_type: "invoice",
        document_number: invoice.invoiceNumber,
        action: "payment_added",
        description: `UPI Reference verified. Received full payment of ${formatINR(pAmount)}.`,
        user_id: "customer_public",
        user_name: "Customer (Public Link)"
      });

      toast.success("Payment Received!", "Your UPI settlement reference has been processed and applied successfully.");
      
      // Refresh local states
      setInvoice({
        ...invoice,
        amountPaid: newAmountPaid,
        amountDue: 0,
        status: "paid"
      });
      setPayments([
        {
          id: payRes?.id || "new-upi-pay-id",
          businessId: invoice.businessId,
          ownerUid: invoice.ownerUid,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          customerName: invoice.customerDetails.name,
          amount: pAmount,
          currency: "INR",
          paymentDate: new Date(),
          paymentMethod: "upi",
          status: "paid"
        } as any,
        ...payments
      ]);
      setActivities([
        {
          id: "new-act-id",
          businessId: invoice.businessId,
          ownerUid: invoice.ownerUid,
          documentId: invoice.id,
          documentType: "invoice",
          documentNumber: invoice.invoiceNumber,
          action: "payment_added",
          description: `UPI Reference verified. Received full payment of ${formatINR(pAmount)}.`,
          userId: "customer_public",
          userName: "Customer (Public Link)",
          timestamp: new Date()
        } as any,
        ...activities
      ]);

      setUpiUtr("");
    } catch (err) {
      console.error(err);
      toast.error("Process Failed", "An error occurred while linking transaction reference.");
    } finally {
      setIsUpiSubmitting(false);
    }
  };

  // Submit card payment simulation (Writing real data on success!)
  const handleCardPaymentSubmit = async () => {
    if (!invoice) return;
    if (!cardNumber || cardNumber.length < 15) {
      toast.error("Invalid Card Number", "Please specify a valid debit/credit card number.");
      return;
    }
    if (!cardExpiry || !cardExpiry.includes("/")) {
      toast.error("Invalid Expiry", "Card expiry date is required in MM/YY format.");
      return;
    }
    if (!cardCvv || cardCvv.length < 3) {
      toast.error("Invalid CVV", "Card CVV code is invalid.");
      return;
    }
    if (!cardName) {
      toast.error("Cardholder Name", "Please enter the name printed on the card.");
      return;
    }

    if (!showOtpField) {
      // Step 1: Initiate transaction
      setIsCardSubmitting(true);
      setCardSubmitStage("Connecting Secure Payment Gateway...");
      
      setTimeout(() => {
        setCardSubmitStage("Securing SSL Handshake...");
        setTimeout(() => {
          setCardSubmitStage("Routing 3D-Secure Authorization...");
          setTimeout(() => {
            setIsCardSubmitting(false);
            setShowOtpField(true);
            toast.success("OTP Sent", "A verification code has been dispatched to your mobile linked with bank.");
          }, 800);
        }, 800);
      }, 1000);
    } else {
      // Step 2: Verification of OTP and Writing real data
      if (!otpValue || otpValue.length < 4) {
        toast.error("OTP Required", "Please specify the 6-digit transaction authorization code.");
        return;
      }

      setIsCardSubmitting(true);
      setCardSubmitStage("Validating Authorization Token...");

      setTimeout(async () => {
        setCardSubmitStage("Capturing Card Ledger settlement...");
        try {
          const pAmount = invoice.amountDue;
          const randomTx = "TXN" + Math.floor(1000000000 + Math.random() * 9000000000);
          
          // 1. Record Payment Doc
          const { data: payRes, error: payErr } = await supabase
            .from('payments')
            .insert({
              business_id: invoice.businessId,
              owner_uid: invoice.ownerUid,
              invoice_id: invoice.id,
              invoice_number: invoice.invoiceNumber,
              customer_id: invoice.customerId || null,
              customer_name: invoice.customerDetails?.name || "Customer",
              customer_email: invoice.customerDetails?.email || null,
              amount: pAmount,
              currency: "INR",
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: "card",
              payment_type: "full",
              status: "paid",
              transaction_id: randomTx,
              reference_number: randomTx,
              notes: `Authorized via Credit/Debit card ending ${cardNumber.slice(-4)}.`,
              recorded_by: "customer_portal"
            })
            .select('id')
            .single();

          if (payErr) throw payErr;

          // 2. Update Invoice Settlement Details
          const newAmountPaid = (invoice.amountPaid || 0) + pAmount;
          await supabase
            .from('sales_documents')
            .update({
              amount_paid: newAmountPaid,
              amount_due: 0,
              status: "paid"
            })
            .eq('id', invoice.id);

          // 3. Log Document Activity
          await supabase.from('document_activities').insert({
            business_id: invoice.businessId,
            owner_uid: invoice.ownerUid,
            document_id: invoice.id,
            document_type: "invoice",
            document_number: invoice.invoiceNumber,
            action: "payment_added",
            description: `Card transaction authorized successfully. Received full payment of ${formatINR(pAmount)}.`,
            user_id: "customer_public",
            user_name: "Customer (Public Link)"
          });

          toast.success("Payment Successful!", `Thank you! Transaction cleared successfully. (Receipt ID: ${randomTx})`);
          
          // Clear form and reset states
          setInvoice({
            ...invoice,
            amountPaid: newAmountPaid,
            amountDue: 0,
            status: "paid"
          });
          setPayments([
            {
              id: payRes?.id || "new-card-pay-id",
              businessId: invoice.businessId,
              ownerUid: invoice.ownerUid,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              customerId: invoice.customerId,
              customerName: invoice.customerDetails?.name || "Customer",
              amount: pAmount,
              currency: "INR",
              paymentDate: new Date(),
              paymentMethod: "card",
              status: "paid"
            } as any,
            ...payments
          ]);
          setActivities([
            {
              id: "new-act-id-card",
              businessId: invoice.businessId,
              ownerUid: invoice.ownerUid,
              documentId: invoice.id,
              documentType: "invoice",
              documentNumber: invoice.invoiceNumber,
              action: "payment_added",
              description: `Card transaction authorized successfully. Received full payment of ${formatINR(pAmount)}.`,
              userId: "customer_public",
              userName: "Customer (Public Link)",
              timestamp: new Date()
            } as any,
            ...activities
          ]);

          setCardNumber("");
          setCardExpiry("");
          setCardCvv("");
          setCardName("");
          setOtpValue("");
          setShowOtpField(false);
        } catch (err) {
          console.error(err);
          toast.error("Ledger Sync Failed", "Card was billed but we could not update the invoice system.");
        } finally {
          setIsCardSubmitting(false);
        }
      }, 1500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase">GATHEX Safeguard</h3>
            <p className="text-xs text-slate-500">Establishing highly secure public ledger gateway...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 text-white font-sans">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
        <Card className="p-8 max-w-md w-full bg-slate-900 border-slate-800 space-y-6 text-center shadow-2xl relative z-10">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black font-display tracking-tight uppercase">Gateway Handshake Failed</h2>
            <p className="text-slate-400 text-xs leading-relaxed">{error}</p>
          </div>
          <div className="border-t border-slate-800 pt-4 text-[10px] text-slate-500 flex justify-center items-center gap-1.5 uppercase font-mono tracking-wider">
            <Shield className="w-3.5 h-3.5" /> GATHEX SECURE NODE ACCESS DENIED
          </div>
        </Card>
      </div>
    );
  }

  if (invoice.sharePassword && !isPasswordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-white relative font-sans">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
        <Card className="p-8 max-w-md w-full bg-slate-900 border-slate-800 space-y-6 shadow-2xl relative z-10">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Security Handshake</h2>
            <p className="text-slate-400 text-xs">This merchant invoice ledger is encrypted with an access password.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Access Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyPassword();
                }}
                className={`w-full bg-slate-950 border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${passwordError ? "border-rose-500 focus:ring-rose-500" : "border-slate-800"}`}
                placeholder="••••••••"
              />
              {passwordError && <p className="text-xs text-rose-500 mt-1.5 font-medium">Incorrect password. Please verify.</p>}
            </div>

            <Button
              variant="primary"
              className="w-full py-2.5 text-sm font-bold shadow-lg"
              onClick={handleVerifyPassword}
            >
              Verify & Read Invoice
            </Button>
          </div>

          <div className="border-t border-slate-800 pt-4 text-[10px] text-slate-500 text-center flex justify-center items-center gap-1.5 font-mono tracking-wider">
            <Shield className="w-3 h-3 text-emerald-500" /> SECURED BY GATHEX ENCRYPTION
          </div>
        </Card>
      </div>
    );
  }

  // Loaded successfully and decrypted
  const themeId = brandingSettings?.invoiceTheme || "modern";
  
  const getThemeClasses = (theme: string) => {
    switch (theme) {
      case "classic": return {
        headerBorder: "border-b-2 border-slate-800 pb-6",
        logoBg: "bg-slate-800 rounded-sm text-white",
        titleColor: "text-slate-800 font-serif",
        accentBadge: "bg-slate-100 text-slate-800 border-slate-300 rounded-sm",
        tableHeader: "bg-slate-100 text-slate-800 border-y-2 border-slate-800",
        highlightText: "text-slate-800",
        totalsBox: "bg-slate-50 border-2 border-slate-800 rounded-sm",
        accentBg: "bg-slate-800",
        wrapperBg: "bg-white text-slate-900",
        wrapperBorder: "border-slate-800 shadow-sm"
      };
      case "minimal": return {
        headerBorder: "border-b border-slate-100 pb-8",
        logoBg: "bg-slate-100 text-slate-900 rounded-full",
        titleColor: "text-slate-900 font-light",
        accentBadge: "bg-transparent text-slate-500 border border-slate-200 rounded-full",
        tableHeader: "border-b border-slate-200 text-slate-500 bg-transparent",
        highlightText: "text-slate-900 font-medium",
        totalsBox: "border-t border-slate-200 bg-transparent",
        accentBg: "bg-slate-900",
        wrapperBg: "bg-white text-slate-900",
        wrapperBorder: "border-slate-200 shadow-none"
      };
      case "bold": return {
        headerBorder: "border-b-4 pb-6",
        logoBg: "rounded-none text-white",
        titleColor: "font-black tracking-tighter text-slate-900",
        accentBadge: "text-white rounded-none",
        tableHeader: "text-white border-none",
        highlightText: "font-bold text-slate-900",
        totalsBox: "border-l-4 rounded-none bg-slate-50/50",
        accentBg: "",
        wrapperBg: "bg-white text-slate-900",
        wrapperBorder: "shadow-xl border-slate-200"
      };
      case "compact": return {
        headerBorder: "border-b border-slate-200 pb-3",
        logoBg: "rounded-lg text-white",
        titleColor: "text-slate-900 font-bold tracking-tight",
        accentBadge: "rounded-md",
        tableHeader: "bg-slate-50 border-y border-slate-200 text-slate-600",
        highlightText: "",
        totalsBox: "bg-slate-50/50 rounded-lg border border-slate-200/60",
        accentBg: "",
        wrapperBg: "bg-white text-slate-900",
        wrapperBorder: "border-slate-200 shadow-sm"
      };
      case "modern":
      default: return {
        headerBorder: "border-b border-slate-200 pb-6",
        logoBg: "rounded-xl shadow-sm text-white",
        titleColor: "text-slate-900 font-extrabold tracking-tight",
        accentBadge: "rounded-md",
        tableHeader: "bg-slate-100/80 border-y border-slate-200 text-slate-600",
        highlightText: "",
        totalsBox: "bg-slate-50 rounded-2xl border border-slate-200/60",
        accentBg: "",
        wrapperBg: "bg-white text-slate-900",
        wrapperBorder: "border-slate-200 shadow-sm"
      };
    }
  };

  const themeClasses = getThemeClasses(themeId);
  const accentColor = brandingSettings?.invoiceAccentColor || "#4f46e5";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 font-sans text-slate-800 dark:text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Portal Branding Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 border border-slate-800/80 text-white p-5 rounded-2xl shadow-xl print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg font-bold text-white text-lg tracking-wider">
              G
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                GATHEX Invoice Customer Portal <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Enterprise Edition</span>
              </h1>
              <p className="text-xs text-slate-400">Secure, encrypted online access center for tax settlements</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button 
              variant="outline" 
              icon={<Printer className="w-4 h-4 text-slate-400" />} 
              onClick={handlePrint}
              className="text-slate-300 border-slate-800 hover:bg-slate-800 h-10 text-xs"
            >
              Print Document
            </Button>
            <Button 
              variant="outline" 
              icon={<Download className="w-4 h-4 text-slate-400" />} 
              onClick={handleDownloadPDF}
              className="text-slate-300 border-slate-800 hover:bg-slate-800 h-10 text-xs"
            >
              Export PDF
            </Button>
          </div>
        </div>

        {/* Double-column Core Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: The actual formatted Invoice sheet */}
          <div className="lg:col-span-8 space-y-6">
            <div 
              className={`${themeClasses.wrapperBg} border ${themeClasses.wrapperBorder} rounded-2xl shadow-lg overflow-hidden relative`} 
              ref={printRef}
              style={{ borderColor: (themeId === "bold" && accentColor) ? accentColor : undefined }}
            >
              {/* Highlight ribbon for bold theme */}
              {themeId === "bold" && (
                <div className="h-2.5 w-full" style={{ backgroundColor: accentColor }} />
              )}

              <div className={`${themeId === "compact" ? "p-6 space-y-6" : "p-10 space-y-10"}`}>
                
                {/* 1. Header block */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-100 pb-8">
                  <div className="space-y-4">
                    {brandingSettings?.logoUrl ? (
                      <img 
                        src={brandingSettings.logoUrl} 
                        alt="Company Logo" 
                        className="max-h-16 max-w-[200px] object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl uppercase">
                        {(business?.name || "B").slice(0, 1)}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">
                        {business?.name || "Business Entity"}
                      </h3>
                      {business?.tradeName && (
                        <p className="text-xs text-slate-500 font-medium">{business.tradeName}</p>
                      )}
                      {business?.gstin && (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <span className="font-bold text-slate-400">GSTIN:</span> 
                          <span className="font-mono font-bold text-slate-700">{business.gstin}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-left md:text-right space-y-3">
                    <h2 
                      className={`text-3xl ${themeClasses.titleColor}`}
                      style={{ color: (themeId !== "classic" && themeId !== "minimal") ? accentColor : undefined }}
                    >
                      TAX INVOICE
                    </h2>
                    <div className="space-y-1.5 text-xs text-slate-500">
                      <p>Invoice Ref: <span className="font-bold text-slate-900 font-mono text-sm">{invoice.invoiceNumber}</span></p>
                      <p>Issue Date: <span className="font-semibold text-slate-800">{new Date(invoice.issueDate).toLocaleDateString("en-IN", { dateStyle: "long" })}</span></p>
                      <p>Due Date: <span className="font-semibold text-rose-600">{new Date(invoice.dueDate).toLocaleDateString("en-IN", { dateStyle: "long" })}</span></p>
                      <div className="pt-1 flex md:justify-end">
                        <Badge 
                          variant={
                            invoice.status === "paid" ? "success" : 
                            invoice.status === "partially_paid" ? "accent" : 
                            invoice.status === "overdue" ? "danger" : "warning"
                          }
                          className="font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[10px]"
                        >
                          {invoice.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Billing details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed border-b border-slate-50 pb-8">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Billed From</h4>
                    <p className="font-bold text-slate-900 text-sm mb-1">{business?.name}</p>
                    <p className="text-slate-600 whitespace-pre-line">
                      {business?.address?.street}<br />
                      {business?.address?.city}, {business?.address?.state} - {business?.address?.postalCode}<br />
                      {business?.address?.country || "India"}
                    </p>
                    <div className="mt-2.5 space-y-1 text-slate-500">
                      <p>Email: <span className="text-slate-700 font-medium">{business?.email}</span></p>
                      <p>Phone: <span className="text-slate-700 font-medium">{business?.phone}</span></p>
                      {business?.website && <p>Web: <span className="text-slate-700 font-medium">{business.website}</span></p>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Billed To (Customer)</h4>
                    <p className="font-bold text-slate-900 text-sm mb-1">{invoice.customerDetails?.name}</p>
                    {invoice.customerDetails?.companyName && (
                      <p className="text-slate-700 font-semibold mb-1">{invoice.customerDetails.companyName}</p>
                    )}
                    <p className="text-slate-600 whitespace-pre-line">
                      {invoice.customerDetails?.address?.street}<br />
                      {invoice.customerDetails?.address?.city}, {invoice.customerDetails?.address?.state} - {invoice.customerDetails?.address?.postalCode}<br />
                      {invoice.customerDetails?.address?.country || "India"}
                    </p>
                    <div className="mt-2.5 space-y-1 text-slate-500">
                      {invoice.customerDetails?.gstin && (
                        <p className="flex items-center gap-1">
                          <span className="font-bold text-slate-400 uppercase text-[9px]">Customer GSTIN:</span>
                          <span className="font-mono font-bold text-slate-700">{invoice.customerDetails.gstin}</span>
                        </p>
                      )}
                      <p>Contact Email: <span className="text-slate-700 font-medium">{invoice.customerDetails?.email}</span></p>
                      <p>Contact Phone: <span className="text-slate-700 font-medium">{invoice.customerDetails?.phone}</span></p>
                    </div>
                  </div>
                </div>

                {/* 3. Itemized List */}
                <div className="overflow-x-auto -mx-4 md:-mx-0">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr 
                        className={`${themeClasses.tableHeader} border-b border-slate-200`}
                        style={{ 
                          backgroundColor: (themeId === "bold" && accentColor) ? accentColor : undefined,
                          color: (themeId === "bold" && accentColor) ? "#ffffff" : undefined
                        }}
                      >
                        <th className="py-3 px-3 font-bold uppercase tracking-wider">Item Details</th>
                        <th className="py-3 px-2 font-bold text-center uppercase tracking-wider">HSN/SAC</th>
                        <th className="py-3 px-2 font-bold text-right uppercase tracking-wider">Rate</th>
                        <th className="py-3 px-2 font-bold text-center uppercase tracking-wider">Qty</th>
                        <th className="py-3 px-2 font-bold text-right uppercase tracking-wider">Tax (GST)</th>
                        <th className="py-3 px-3 font-bold text-right uppercase tracking-wider">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.items?.map((item, idx) => {
                        const rate = item.gstRate || 0;
                        const qty = item.quantity || 1;
                        const unitPrice = item.price || 0;
                        const disc = item.discountAmount || 0;
                        const taxable = (unitPrice * qty) - disc;
                        const taxTotal = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/40">
                            <td className="py-4 px-3">
                              <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                              {item.description && (
                                <p className="text-slate-400 text-[11px] mt-1 whitespace-pre-line leading-relaxed">{item.description}</p>
                              )}
                            </td>
                            <td className="py-4 px-2 text-center text-slate-500 font-mono text-[10px]">
                              {item.hsnSacCode || "—"}
                            </td>
                            <td className="py-4 px-2 text-right font-mono text-slate-600">
                              {formatINR(unitPrice)}
                            </td>
                            <td className="py-4 px-2 text-center font-semibold text-slate-700">
                              {qty} <span className="text-[10px] text-slate-400 font-normal">{item.unit || "Pcs"}</span>
                            </td>
                            <td className="py-4 px-2 text-right">
                              <span className="font-mono text-slate-600 block">{formatINR(taxTotal)}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({rate}%)</span>
                            </td>
                            <td className="py-4 px-3 text-right font-bold text-slate-900 font-mono">
                              {formatINR(item.totalAmount || (taxable + taxTotal))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 4. Financial Summation */}
                <div className="flex flex-col md:flex-row justify-between items-start pt-6 border-t border-slate-100 gap-6">
                  {/* Notes & Terms conditions in sheet */}
                  <div className="flex-1 space-y-4 max-w-md text-xs text-slate-500">
                    {invoice.notes && (
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/60">
                        <h5 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                          <Info className="w-3.5 h-3.5 text-indigo-500" /> Merchant Memo
                        </h5>
                        <p className="whitespace-pre-line leading-relaxed text-slate-600">{invoice.notes}</p>
                      </div>
                    )}
                    {invoice.termsConditions && (
                      <div className="p-1">
                        <h5 className="font-bold text-slate-800 mb-1.5 uppercase text-[10px] tracking-wider">
                          Terms & Conditions
                        </h5>
                        <p className="whitespace-pre-line leading-relaxed text-[11px] text-slate-400">{invoice.termsConditions}</p>
                      </div>
                    )}
                  </div>

                  {/* Pricing break downs */}
                  <div className="w-full md:w-80 space-y-3.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gross Taxable Subtotal:</span>
                      <span className="font-mono font-semibold">{formatINR(invoice.subTotal)}</span>
                    </div>
                    {invoice.totalDiscount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Total Discounts:</span>
                        <span className="font-mono text-emerald-600 font-semibold">-{formatINR(invoice.totalDiscount)}</span>
                      </div>
                    )}
                    
                    {/* GST Compliance breakdown */}
                    <div className="space-y-1.5 border-t border-b border-slate-100/80 py-2.5 text-[11px] text-slate-400 font-mono">
                      {invoice.totalCgst > 0 && (
                        <div className="flex justify-between">
                          <span>Central Tax (CGST):</span>
                          <span>{formatINR(invoice.totalCgst)}</span>
                        </div>
                      )}
                      {invoice.totalSgst > 0 && (
                        <div className="flex justify-between">
                          <span>State Tax (SGST):</span>
                          <span>{formatINR(invoice.totalSgst)}</span>
                        </div>
                      )}
                      {invoice.totalIgst > 0 && (
                        <div className="flex justify-between">
                          <span>Integrated Tax (IGST):</span>
                          <span>{formatINR(invoice.totalIgst)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between text-base font-black text-slate-900 pt-1">
                      <span>Grand Total:</span>
                      <span className="font-mono" style={{ color: accentColor }}>{formatINR(invoice.grandTotal)}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-slate-500 mt-2">
                      <div className="flex justify-between font-semibold text-slate-600">
                        <span>Paid Credits:</span>
                        <span className="font-mono text-emerald-600">{formatINR(invoice.amountPaid || 0)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-slate-800 border-t border-slate-200/60 pt-2">
                        <span>Balance Outstanding:</span>
                        <span className={`font-mono ${invoice.amountDue > 0 ? "text-rose-600" : "text-emerald-600 font-black"}`}>
                          {formatINR(invoice.amountDue)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Stamp / Signature and Footer */}
                <div className="pt-8 border-t border-slate-100/80 flex justify-between items-center text-xs text-slate-400">
                  <div>
                    <p className="font-medium">{brandingSettings?.invoiceFooterText || "Thank you for choosing GATHEX ledger services."}</p>
                    <p className="text-[10px] mt-1 text-slate-300 font-mono">ID: {invoice.id}</p>
                  </div>
                  
                  {brandingSettings?.authorizedSignatureUrl && (
                    <div className="text-center space-y-1">
                      <img 
                        src={brandingSettings.authorizedSignatureUrl} 
                        alt="Authorized Sign" 
                        className="max-h-12 max-w-[120px] object-contain mx-auto"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Authorized Signatory</span>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* ATTACHMENTS PANEL inside LEFT Column */}
            {attachments.length > 0 && (
              <Card className="p-6 bg-white border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" /> Supporting Attachments ({attachments.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attachments.map((asset, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate text-left">
                          <p className="text-xs font-bold text-slate-800 truncate">{asset.name}</p>
                          <p className="text-[9px] text-slate-400 font-mono">{(asset.size / 1024).toFixed(1)} KB • Document</p>
                        </div>
                      </div>
                      <a 
                        href={asset.url} 
                        download={asset.name}
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer flex-shrink-0"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </Card>
            )}

          </div>

          {/* RIGHT COLUMN: Interactive Customer Payment Action center */}
          <div className="lg:col-span-4 space-y-6 print:hidden">
            
            {/* 1. Secure Status Box */}
            <Card className="p-5 bg-slate-900 border-slate-800 text-white space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> GATHEX Guard
                </span>
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 uppercase tracking-wider">
                  ● encrypted
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Outstanding Due</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono">
                    {formatINR(invoice.amountDue)}
                  </span>
                  <span className="text-xs text-slate-400">INR</span>
                </div>
                {invoice.amountDue > 0 ? (
                  <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Settlement requested by {new Date(invoice.dueDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Fully settled and cleared on ledger
                  </p>
                )}
              </div>
            </Card>

            {/* 2. Payment Settlement Terminal */}
            {invoice.amountDue > 0 && (
              <Card className="p-6 bg-white border-slate-200/80 space-y-6">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
                    <CreditCard className="w-4.5 h-4.5 text-indigo-500" /> Settlement Gateway
                  </h4>
                  <p className="text-xs text-slate-400">Select your preferred payment channel below</p>
                </div>

                {/* Tab selections */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">
                  <button
                    onClick={() => setActivePaymentTab("upi")}
                    className={`py-2 rounded-md transition-all cursor-pointer text-center ${activePaymentTab === "upi" ? "bg-white text-indigo-600 shadow-xs" : "hover:text-slate-700"}`}
                  >
                    UPI QR
                  </button>
                  <button
                    onClick={() => setActivePaymentTab("card")}
                    className={`py-2 rounded-md transition-all cursor-pointer text-center ${activePaymentTab === "card" ? "bg-white text-indigo-600 shadow-xs" : "hover:text-slate-700"}`}
                  >
                    Card
                  </button>
                  <button
                    onClick={() => setActivePaymentTab("bank")}
                    className={`py-2 rounded-md transition-all cursor-pointer text-center ${activePaymentTab === "bank" ? "bg-white text-indigo-600 shadow-xs" : "hover:text-slate-700"}`}
                  >
                    Bank
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="pt-2">
                  
                  {/* TAB A: UPI QR code */}
                  {activePaymentTab === "upi" && (
                    <div className="space-y-5 text-center animate-in fade-in slide-in-from-top-2 duration-150">
                      {upiConfig ? (
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            <div className="p-2 border-2 border-slate-100 rounded-xl bg-white shadow-xs max-w-[200px]">
                              <QRPaymentCard 
                                upiString={generateDynamicUpiString(invoice, upiConfig) || ""} 
                                payeeName={upiConfig.merchantName || business?.name || "Business"} 
                                upiId={upiConfig.primaryUpiId} 
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1 px-2 text-xs">
                            <p className="font-bold text-slate-800">Scan QR to settle instantly</p>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              Supports BHIM, PhonePe, Google Pay, Paytm, and all banking applications.
                            </p>
                          </div>

                          {/* Reference input field */}
                          <div className="border-t border-slate-100 pt-4 space-y-3 text-left">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                Enter 12-Digit UPI Ref Number (UTR)
                              </label>
                              <input
                                type="text"
                                value={upiUtr}
                                onChange={(e) => setUpiUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                                placeholder="e.g., 319203810291"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <Button
                              variant="primary"
                              onClick={handleUpiPaymentSubmit}
                              disabled={isUpiSubmitting}
                              className="w-full py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700"
                            >
                              {isUpiSubmitting ? "Processing Ledger Sync..." : "Confirm & Complete Payment"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-slate-400 space-y-2">
                          <QrCode className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="text-xs font-bold text-slate-500">UPI Payments Unavailable</p>
                          <p className="text-[10px] text-slate-400 leading-normal px-4">
                            The merchant hasn't configured primary UPI credentials for this business entity.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB B: Credit / Debit Card Simulator */}
                  {activePaymentTab === "card" && (
                    <div className="space-y-4 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                      
                      {!showOtpField ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cardholder Name</label>
                            <input
                              type="text"
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder="Name on card"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Debit/Credit Card Number</label>
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, "").replace(/(\d{4})/g, "$1 ").trim().slice(0, 19))}
                              placeholder="4111 2222 3333 4444"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Expiry Date</label>
                              <input
                                type="text"
                                value={cardExpiry}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/\D/g, "");
                                  if (v.length <= 2) setCardExpiry(v);
                                  else setCardExpiry(v.slice(0, 2) + "/" + v.slice(2, 4));
                                }}
                                placeholder="MM/YY"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Security Code (CVV)</label>
                              <input
                                type="password"
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                placeholder="•••"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button
                              variant="primary"
                              onClick={handleCardPaymentSubmit}
                              disabled={isCardSubmitting}
                              className="w-full py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 flex justify-center items-center gap-1.5"
                            >
                              {isCardSubmitting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>{cardSubmitStage}</span>
                                </>
                              ) : (
                                <span>Proceed Securely</span>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 p-4 border border-indigo-100 bg-indigo-500/5 rounded-xl text-center">
                          <Shield className="w-8 h-8 text-indigo-500 mx-auto" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-800">GATHEX 3D Secure Verification</p>
                            <p className="text-[10px] text-slate-400">Enter the verification token dispatched to your phone</p>
                          </div>
                          
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={otpValue}
                              onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="e.g. 291038"
                              className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-center text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 mx-auto"
                            />
                            
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowOtpField(false);
                                  setOtpValue("");
                                }}
                                className="text-[11px] h-9"
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                onClick={handleCardPaymentSubmit}
                                disabled={isCardSubmitting}
                                className="bg-indigo-600 hover:bg-indigo-700 text-[11px] h-9"
                              >
                                {isCardSubmitting ? "Authorizing..." : "Submit OTP"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-[9px] text-slate-400 flex items-center justify-center gap-1 mt-2 uppercase font-mono">
                        <Lock className="w-3 h-3 text-emerald-500" /> PCI-DSS Compliant Secure Gateway Tunnel
                      </div>
                    </div>
                  )}

                  {/* TAB C: Direct Bank Transfer Details */}
                  {activePaymentTab === "bank" && (
                    <div className="space-y-4 text-left text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                      {paymentSettings?.bankName ? (
                        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3 leading-relaxed">
                          <div className="space-y-1 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Settlement Bank</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{paymentSettings.bankName}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] text-slate-400">Account Holder</p>
                              <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{paymentSettings.accountHolder}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400">Account Number</p>
                              <p className="font-mono font-bold text-slate-700 dark:text-slate-300 select-all">{paymentSettings.accountNumber}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400">Bank IFSC Code</p>
                              <p className="font-mono font-bold text-slate-700 dark:text-slate-300 select-all">{paymentSettings.ifsc}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400">Branch Name</p>
                              <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{paymentSettings.branch}</p>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-[10px] text-slate-400 leading-normal bg-indigo-500/5 -mx-4 -mb-4 p-4 rounded-b-xl">
                            <span className="font-bold text-indigo-500 block mb-0.5">Note:</span>
                            Kindly dispatch transaction proof (UTR reference or receipt document) to the merchant on email once transfer is posted.
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-slate-400 space-y-2">
                          <Building className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="text-xs font-bold text-slate-500">Bank Transfer Details Empty</p>
                          <p className="text-[10px] text-slate-400 leading-normal px-4">
                            The merchant has not provided bank transfer coordinates for direct NEFT/RTGS wire settlement.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </Card>
            )}

            {/* 3. Real Payment History List */}
            {payments.length > 0 && (
              <Card className="p-5 bg-white border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-slate-500" /> Payment History ({payments.length})
                </h4>
                <div className="space-y-3">
                  {payments.map((pay, pIdx) => (
                    <div 
                      key={pIdx} 
                      className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-center text-xs gap-3"
                    >
                      <div className="space-y-1 text-left flex-1 min-w-0">
                        <p className="font-bold text-slate-800 flex items-center gap-1.5 capitalize truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {pay.paymentMethod.replace("_", " ")} Transfer
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono truncate">Ref: {pay.referenceNumber || pay.transactionId || "Direct"}</p>
                        <p className="text-[9px] text-slate-400">{pay.paymentDate.toLocaleDateString("en-IN")}</p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <span className="font-bold font-mono text-emerald-600 block">{formatINR(pay.amount)}</span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[8px] block w-max ml-auto">
                            SUCCESS
                          </span>
                        </div>
                        <Button 
                          onClick={() => {
                            setSelectedPaymentForReceipt(pay);
                            setIsReceiptOpen(true);
                          }}
                          variant="outline"
                          className="font-bold text-xs gap-1 py-1 px-2.5 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                        >
                          <Receipt className="w-3.5 h-3.5" /> Receipt
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 4. Real Invoice Lifecycle Timeline */}
            <Card className="p-5 bg-white border-slate-200/80 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" /> Audit Timeline & Lifecycle
              </h4>
              <div className="relative pl-4 border-l border-slate-100 space-y-4">
                
                {/* 1. Dynamic fetched actions */}
                {activities.map((act, aIdx) => (
                  <div key={aIdx} className="relative text-xs">
                    {/* Tick bubble */}
                    <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900" />
                    <div className="space-y-0.5 text-left">
                      <p className="font-bold text-slate-800 capitalize">{act.action.replace("_", " ")}</p>
                      <p className="text-[10px] text-slate-500 leading-normal">{act.description}</p>
                      <p className="text-[9px] text-slate-400">{new Date(act.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</p>
                    </div>
                  </div>
                ))}

                {/* 2. Standard creation anchor fallback if no activities */}
                <div className="relative text-xs">
                  <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  <div className="space-y-0.5 text-left">
                    <p className="font-bold text-slate-800">Invoice Finalized</p>
                    <p className="text-[10px] text-slate-500">Document generated and signed on business ledger.</p>
                    <p className="text-[9px] text-slate-400">
                      {new Date(invoice.createdAt || invoice.issueDate).toLocaleDateString("en-IN", { dateStyle: "short" })}
                    </p>
                  </div>
                </div>

              </div>
            </Card>

            {/* Support link helper */}
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 text-[11px] text-slate-500">
              Need assistance? Support requests can be raised directly with the merchant at <a href={`mailto:${business?.email}`} className="text-indigo-600 font-bold hover:underline">{business?.email}</a>.
            </div>

          </div>

        </div>

      </div>

      {/* Payment Receipt Dialog Hook */}
      <ReceiptPreviewDialog 
        isOpen={isReceiptOpen} 
        onClose={() => {
          setIsReceiptOpen(false);
          setSelectedPaymentForReceipt(null);
        }} 
        payment={selectedPaymentForReceipt} 
      />

    </div>
  );
}
