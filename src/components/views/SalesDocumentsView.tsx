import React, { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EmptyState } from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase/config";
import { DocumentPreview } from "./DocumentPreview";
import { 
  FileText, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  Send,
  Trash2,
  ArrowLeft,
  QrCode,
  Sparkles,
  Printer,
  Receipt,
  Percent,
  Check,
  Building,
  AlertCircle
} from "lucide-react";
import { Customer, ProductService, Invoice } from "../../types";
import { downloadGSTR1CSV } from "../../utils/spreadsheet";

const STATES_LIST = [
  "Andhra Pradesh (37)", "Arunachal Pradesh (12)", "Assam (18)", "Bihar (10)", "Chhattisgarh (22)",
  "Delhi (07)", "Goa (30)", "Gujarat (24)", "Haryana (06)", "Himachal Pradesh (02)", "Jammu & Kashmir (01)",
  "Jharkhand (20)", "Karnataka (29)", "Kerala (32)", "Madhya Pradesh (23)", "Maharashtra (27)", "Manipur (14)",
  "Meghalaya (17)", "Mizoram (15)", "Nagaland (13)", "Odisha (21)", "Punjab (03)", "Rajasthan (08)",
  "Sikkim (11)", "Tamil Nadu (33)", "Telangana (36)", "Tripura (16)", "Uttar Pradesh (09)", "Uttarakhand (05)",
  "West Bengal (19)"
];

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

import { salesDocumentService } from "../../services/salesDocumentService";
import { notificationService } from "../../services/notificationService";

export function SalesDocumentsView({ docType = "invoice" }: { docType?: "invoice" | "quotation" | "proforma_invoice" | "credit_note" | "debit_note" | "delivery_challan" | "purchase_order" }) {

  const docConfig = {
    invoice: { collection: 'invoices', singular: 'Invoice', plural: 'Invoices'},
    quotation: { collection: 'quotations', singular: 'Quotation', plural: 'Quotations'},
    proforma_invoice: { collection: 'proforma_invoices', singular: 'Proforma Invoice', plural: 'Proforma Invoices'},
    credit_note: { collection: 'credit_notes', singular: 'Credit Note', plural: 'Credit Notes'},
    debit_note: { collection: 'debit_notes', singular: 'Debit Note', plural: 'Debit Notes'},
    delivery_challan: { collection: 'delivery_challans', singular: 'Delivery Challan', plural: 'Delivery Challans'},
    purchase_order: { collection: 'purchase_orders', singular: 'Purchase Order', plural: 'Purchase Orders'}
  }[docType];

  const toast = useToast();
  const { user, activeBusiness } = useAuth();
  
  // View mode
  const [viewMode, setViewMode] = useState<"list" | "create" | "preview">("list");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceState | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Synced lists from Firestore
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProductService[]>([]);
  const [invoices, setInvoices] = useState<InvoiceState[]>([]);

  // Active Business fallbacks
  const businessName = activeBusiness?.name || "GATHEX Technologies Pvt Ltd";
  const businessGstin = activeBusiness?.gstin || "27AAECG8492C1Z2"; // Maharashtra (27)
  const businessAddressStr = activeBusiness?.address 
    ? `${activeBusiness.address.street || ""}, ${activeBusiness.address.city || ""}, ${activeBusiness.address.state || ""} - ${activeBusiness.address.postalCode || ""}`
    : "402, GATHEX Incline Towers, Andheri East, Mumbai, Maharashtra (27) - 400069";
  const businessBank = activeBusiness?.bankDetails || {
    accountName: "GATHEX Technologies Pvt Ltd",
    accountNumber: "50200084928192",
    bankName: "HDFC Bank Ltd",
    ifsc: "HDFC0000104",
    branch: "Andheri East, Mumbai"
  };
  const businessUpi = activeBusiness?.upiId || "gathex@hdfcbank";

  // Invoice creator form states
  const [invNumber, setInvNumber] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customCustomerName, setCustomCustomerName] = useState("");
  const [customCustomerGstin, setCustomCustomerGstin] = useState("");
  const [customCustomerEmail, setCustomCustomerEmail] = useState("");
  const [customCustomerPhone, setCustomCustomerPhone] = useState("");
  const [customCustomerAddress, setCustomCustomerAddress] = useState("");
  const [customCustomerState, setCustomCustomerState] = useState("");

  const [invDate, setInvDate] = useState("");
  const [invDueDate, setInvDueDate] = useState("");
  const [invPlaceOfSupply, setInvPlaceOfSupply] = useState("");
  const [invItems, setInvItems] = useState<InvoiceItemState[]>([]);
  const [invNotes, setInvNotes] = useState("Thank you for your business!");
  const [invTerms, setInvTerms] = useState("1. Please pay within due date to avoid interest charge.\n2. All disputes subject to local jurisdiction.");
  const [invDiscountGlobal, setInvDiscountGlobal] = useState<number>(0);

  // 1. Sync Customers from Supabase
  useEffect(() => {
    if (!user || !activeBusiness) return;

    supabase
      .from('customers')
      .select('*')
      .eq('business_id', activeBusiness.id)
      .eq('is_archived', false)
      .then(({ data, error }) => {
        if (!error && data) {
          const list = data.map(d => ({
            id: d.id,
            businessId: d.business_id,
            ownerUid: d.owner_uid,
            name: d.name,
            companyName: d.company_name,
            gstin: d.gstin,
            email: d.email,
            phone: d.phone,
            billingAddress: d.billing_address || {},
            shippingAddress: d.shipping_address || {},
            createdAt: d.created_at ? new Date(d.created_at) : new Date(),
            updatedAt: d.updated_at ? new Date(d.updated_at) : new Date(),
            isArchived: !!d.is_archived
          } as Customer));
          setCustomers(list);
        }
      });
  }, [user, activeBusiness]);

  // 2. Sync Products from Supabase
  useEffect(() => {
    if (!user || !activeBusiness) return;

    supabase
      .from('products_services')
      .select('*')
      .eq('business_id', activeBusiness.id)
      .then(({ data, error }) => {
        if (!error && data) {
          const list = data.map(d => ({
            id: d.id,
            businessId: d.business_id,
            ownerUid: d.owner_uid,
            type: d.type,
            name: d.name,
            skuCode: d.sku_code,
            hsnSacCode: d.hsn_sac_code,
            description: d.description,
            price: Number(d.price || 0),
            unit: d.unit || "Pcs",
            gstRate: Number(d.gst_rate || 0),
            cessRate: Number(d.cess_rate || 0),
            createdAt: d.created_at ? new Date(d.created_at) : new Date(),
            updatedAt: d.updated_at ? new Date(d.updated_at) : new Date()
          } as ProductService));
          setProducts(list);
        }
      });
  }, [user, activeBusiness]);

  // 3. Sync Invoices from Supabase
  useEffect(() => {
    if (!user || !activeBusiness) return;

    setLoading(true);
    const fetchDocs = async () => {
      const { data: docs, error } = await supabase
        .from('sales_documents')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .eq('doc_type', docType)
        .order('created_at', { ascending: false });

      if (error || !docs) {
        setLoading(false);
        return;
      }

      const docIds = docs.map(d => d.id);
      const itemsMap = await salesDocumentService.fetchItemsForDocs(docIds);

      const list: InvoiceState[] = docs.map(data => {
        const addressObj = data.customer_details?.address;
        const mappedAddress = typeof addressObj === 'object'
          ? `${addressObj.street || ""}, ${addressObj.city || ""}, ${addressObj.state || ""}`
          : String(addressObj || "");

        const items = (itemsMap[data.id] || []).map((it: any) => ({
          productId: it.productId || "custom",
          name: it.name || "",
          hsnSacCode: it.hsnSacCode || "",
          price: Number(it.price || 0),
          quantity: Number(it.quantity || 1),
          discountAmount: Number(it.discountAmount || 0),
          gstRate: Number(it.gstRate || 0),
          unit: it.unit || "Pcs"
        }));

        return {
          id: data.id,
          invoiceNumber: data.doc_number || "",
          customerName: data.customer_details?.companyName || data.customer_details?.name || "B2C Client",
          customerGstin: data.customer_details?.gstin || "",
          customerAddress: mappedAddress,
          customerState: typeof addressObj === 'object' ? addressObj.state || "" : mappedAddress,
          customerEmail: data.customer_details?.email || "",
          customerPhone: data.customer_details?.phone || "",
          date: data.issue_date || "",
          dueDate: data.due_date || "",
          placeOfSupply: typeof addressObj === 'object' ? addressObj.state || "" : mappedAddress,
          items,
          notes: data.notes || "",
          terms: data.terms_conditions || "",
          discountGlobal: Number(data.total_discount || 0),
          status: data.status || "sent"
        };
      });

      setInvoices(list);
      setLoading(false);
    };

    fetchDocs();

    const channel = supabase
      .channel(`sales_documents-${activeBusiness.id}-${docType}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_documents', filter: `business_id=eq.${activeBusiness.id}` }, () => fetchDocs())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeBusiness, docType]);

  // Sync place of supply when customer dropdown selection shifts
  useEffect(() => {
    if (selectedCustomerId && selectedCustomerId !== "custom") {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust) {
        setInvPlaceOfSupply(cust.billingAddress?.state || STATES_LIST[0]);
      }
    }
  }, [selectedCustomerId, customers]);

  // Initialize form workspace
  const initCreateMode = () => {
    setEditingInvoiceId(null);
    const nextNum = `GATHEX/2026/${String(invoices.length + 1).padStart(3, "0")}`;
    const today = new Date().toISOString().split("T")[0];
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 15);
    const dueDateStr = defaultDue.toISOString().split("T")[0];

    setInvNumber(nextNum);
    
    if (customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
      setInvPlaceOfSupply(customers[0].billingAddress?.state || STATES_LIST[0]);
    } else {
      setSelectedCustomerId("custom");
      setInvPlaceOfSupply(STATES_LIST[0]);
    }

    setInvDate(today);
    setInvDueDate(dueDateStr);
    
    // Set first catalog product if available, else custom fallback
    if (products.length > 0) {
      setInvItems([
        {
          productId: products[0].id,
          name: products[0].name,
          hsnSacCode: products[0].hsnSacCode || "",
          price: products[0].price,
          quantity: 1,
          discountAmount: 0,
          gstRate: products[0].gstRate,
          unit: products[0].unit
        }
      ]);
    } else {
      setInvItems([
        {
          productId: "custom",
          name: "SaaS Software Implementation",
          hsnSacCode: "998311",
          price: 50000,
          quantity: 1,
          discountAmount: 0,
          gstRate: 18,
          unit: "Job"
        }
      ]);
    }

    setInvDiscountGlobal(0);
    setInvNotes("Thank you for partnering with GATHEX!");
    setInvTerms("1. Standard 18% interest rate charged for overdue payments.\n2. Goods once delivered are not subject to return.");
    
    setCustomCustomerName("");
    setCustomCustomerGstin("");
    setCustomCustomerEmail("");
    setCustomCustomerPhone("");
    setCustomCustomerAddress("");
    setCustomCustomerState(STATES_LIST[0]);

    setViewMode("create");
  };

  // Switch row selections inside lines
  const handleItemProductChange = (index: number, pId: string) => {
    const updated = [...invItems];
    if (pId === "custom") {
      updated[index] = {
        ...updated[index],
        productId: "custom",
        name: "Custom Line Item",
        hsnSacCode: "998311",
        price: 1500,
        gstRate: 18,
        unit: "Pcs"
      };
    } else {
      const prod = products.find(p => p.id === pId);
      if (prod) {
        updated[index] = {
          ...updated[index],
          productId: prod.id,
          name: prod.name,
          hsnSacCode: prod.hsnSacCode || "",
          price: prod.price,
          gstRate: prod.gstRate,
          unit: prod.unit
        };
      }
    }
    setInvItems(updated);
  };

  const handleAddFieldRow = () => {
    if (products.length > 0) {
      setInvItems([
        ...invItems,
        {
          productId: products[0].id,
          name: products[0].name,
          hsnSacCode: products[0].hsnSacCode || "",
          price: products[0].price,
          quantity: 1,
          discountAmount: 0,
          gstRate: products[0].gstRate,
          unit: products[0].unit
        }
      ]);
    } else {
      setInvItems([
        ...invItems,
        {
          productId: "custom",
          name: "Custom Consulting Charge",
          hsnSacCode: "998311",
          price: 2500,
          quantity: 1,
          discountAmount: 0,
          gstRate: 18,
          unit: "Hrs"
        }
      ]);
    }
  };

  const handleRemoveFieldRow = (index: number) => {
    if (invItems.length === 1) {
      toast.error("Invalid action", "Invoices must contain at least one line item.");
      return;
    }
    setInvItems(invItems.filter((_, i) => i !== index));
  };

  // Indian format helper
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  // Math calculation engine for creating invoices
  const calculateInvoiceMath = (inv: {
    items: InvoiceItemState[];
    placeOfSupply: string;
    discountGlobal: number;
  }) => {
    let subTotal = 0;
    let totalDiscount = Number(inv.discountGlobal) || 0;
    let totalTaxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    // Extract business state code from Gstin (first 2 digits)
    const bizStateCode = businessGstin.substring(0, 2);
    
    // Extract customer state code from Place of Supply State selection e.g. "Maharashtra (27)"
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

  // Edit mode initializer
  const initEditMode = (inv: InvoiceState) => {
    setEditingInvoiceId(inv.id);
    setInvNumber(inv.invoiceNumber);
    
    const customerObj = customers.find(c => c.name === inv.customerName || c.companyName === inv.customerName || c.gstin === inv.customerGstin);
    if (customerObj) {
      setSelectedCustomerId(customerObj.id);
    } else {
      setSelectedCustomerId("custom");
      setCustomCustomerName(inv.customerName);
      setCustomCustomerGstin(inv.customerGstin);
      setCustomCustomerEmail(inv.customerEmail);
      setCustomCustomerPhone(inv.customerPhone);
      setCustomCustomerAddress(inv.customerAddress);
      setCustomCustomerState(inv.customerState || STATES_LIST[0]);
    }

    setInvDate(inv.date);
    setInvDueDate(inv.dueDate);
    setInvPlaceOfSupply(inv.placeOfSupply || STATES_LIST[0]);
    setInvItems(inv.items);
    setInvNotes(inv.notes);
    setInvTerms(inv.terms);
    setInvDiscountGlobal(inv.discountGlobal);
    setViewMode("create");
  };

  // Duplicate clone invoice
  const handleDuplicateInvoice = async (inv: InvoiceState) => {
    if (!user || !activeBusiness) return;
    
    const nextNum = `GATHEX/2026/${String(invoices.length + 1).padStart(3, "0")}`;
    const today = new Date().toISOString().split("T")[0];
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 15);
    const dueDateStr = defaultDue.toISOString().split("T")[0];

    const customerObj = customers.find(c => c.name === inv.customerName || c.companyName === inv.customerName || c.gstin === inv.customerGstin);
    const custId = customerObj ? customerObj.id : "custom";

    const math = calculateInvoiceMath({
      items: inv.items,
      placeOfSupply: inv.placeOfSupply,
      discountGlobal: inv.discountGlobal
    });

    const invoicePayload = {
      businessId: activeBusiness.id,
      ownerUid: user.uid,
      invoiceNumber: nextNum,
      status: "draft",
      customerId: custId,
      customerDetails: {
        name: inv.customerName,
        companyName: custId === "custom" ? "" : inv.customerName,
        gstin: inv.customerGstin,
        email: inv.customerEmail,
        phone: inv.customerPhone,
        address: {
          street: inv.customerAddress,
          city: "Mumbai",
          state: inv.customerState || STATES_LIST[0],
          postalCode: "",
          country: "India"
        }
      },
      issueDate: today,
      dueDate: dueDateStr,
      placeOfSupply: inv.placeOfSupply,
      items: math.computedItems.map(item => ({
        productId: item.productId,
        name: item.name,
        hsnSacCode: item.hsnSacCode,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit,
        discountAmount: item.discountAmount,
        gstRate: item.gstRate,
        cgstAmount: item.cgst,
        sgstAmount: item.sgst,
        igstAmount: item.igst,
        totalAmount: item.rowTotal
      })),
      subTotal: math.subTotal,
      totalDiscount: math.totalDiscount,
      totalTaxableAmount: math.totalTaxableAmount,
      totalCgst: math.totalCgst,
      totalSgst: math.totalSgst,
      totalIgst: math.totalIgst,
      grandTotal: math.grandTotal,
      amountPaid: 0,
      amountDue: math.grandTotal,
      notes: inv.notes,
      termsConditions: inv.terms
    };

    try {
      await salesDocumentService.createDocument({
        ...invoicePayload,
        docType
      });
      toast.success("Invoice Cloned!", `Duplicated to a new draft invoice: ${nextNum}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Clone Failed", err.message || "Could not duplicate document.");
    }
  };

  // Live Status Change
  const handleStatusChange = async (inv: InvoiceState, newStatus: "paid" | "sent" | "overdue" | "draft") => {
    if (!user || !activeBusiness) return;
    
    const math = calculateInvoiceMath(inv);
    const amountPaid = newStatus === "paid" ? math.grandTotal : 0;
    const amountDue = newStatus === "paid" ? 0 : math.grandTotal;

    try {
      await salesDocumentService.updateDocument(inv.id, docType, {
        status: newStatus,
        amountPaid,
        amountDue
      });

      setSelectedInvoice({
        ...inv,
        status: newStatus
      });

      toast.success("Classification Updated", `Invoice status changed to ${newStatus.toUpperCase()}.`);
    } catch (err: any) {
      console.error(err);
      toast.error("Update Failed", err.message || "Could not update status.");
    }
  };

  // Save the invoice to Firestore
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeBusiness) return;

    let customerName = "";
    let customerGstin = "";
    let customerEmail = "";
    let customerPhone = "";
    let billingAddress: any = null;

    if (selectedCustomerId === "custom") {
      if (!customCustomerName.trim()) {
        toast.error("Validation Error", "Please provide a Custom Customer Name.");
        return;
      }
      customerName = customCustomerName.trim();
      customerGstin = customCustomerGstin.toUpperCase().trim();
      customerEmail = customCustomerEmail.trim();
      customerPhone = customCustomerPhone.trim();
      billingAddress = {
        street: customCustomerAddress.trim() || "Retail Spot Billing",
        city: "Mumbai",
        state: customCustomerState,
        postalCode: "",
        country: "India"
      };
    } else {
      const custObj = customers.find(c => c.id === selectedCustomerId);
      if (!custObj) {
        toast.error("Validation Error", "Invalid customer selected.");
        return;
      }
      customerName = custObj.name;
      customerGstin = custObj.gstin || "";
      customerEmail = custObj.email || "";
      customerPhone = custObj.phone || "";
      billingAddress = custObj.billingAddress;
    }

    if (invItems.length === 0) {
      toast.error("Validation Error", "Please add at least one line item.");
      return;
    }

    const math = calculateInvoiceMath({
      items: invItems,
      placeOfSupply: invPlaceOfSupply,
      discountGlobal: invDiscountGlobal
    });

    const invoicePayload = {
      businessId: activeBusiness.id,
      ownerUid: user.uid,
      invoiceNumber: invNumber.trim() || `GATHEX/2026/${String(invoices.length + 1).padStart(3, "0")}`,
      status: "sent",
      customerId: selectedCustomerId,
      customerDetails: {
        name: customerName,
        companyName: selectedCustomerId === "custom" ? "" : customerName,
        gstin: customerGstin,
        email: customerEmail,
        phone: customerPhone,
        address: billingAddress
      },
      issueDate: invDate,
      dueDate: invDueDate,
      placeOfSupply: invPlaceOfSupply,
      items: math.computedItems.map(item => ({
        productId: item.productId,
        name: item.name,
        hsnSacCode: item.hsnSacCode,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit,
        discountAmount: item.discountAmount,
        gstRate: item.gstRate,
        cgstAmount: item.cgst,
        sgstAmount: item.sgst,
        igstAmount: item.igst,
        totalAmount: item.rowTotal
      })),
      subTotal: math.subTotal,
      totalDiscount: math.totalDiscount,
      totalTaxableAmount: math.totalTaxableAmount,
      totalCgst: math.totalCgst,
      totalSgst: math.totalSgst,
      totalIgst: math.totalIgst,
      grandTotal: math.grandTotal,
      amountPaid: 0,
      amountDue: math.grandTotal,
      notes: invNotes,
      termsConditions: invTerms
    };

    try {
      if (editingInvoiceId) {
        await salesDocumentService.updateDocument(editingInvoiceId, docType, {
          docNumber: invoicePayload.invoiceNumber,
          status: invoicePayload.status,
          customerId: invoicePayload.customerId,
          customerDetails: invoicePayload.customerDetails,
          issueDate: invoicePayload.issueDate,
          dueDate: invoicePayload.dueDate,
          placeOfSupply: invoicePayload.placeOfSupply,
          items: invoicePayload.items,
          subTotal: invoicePayload.subTotal,
          totalDiscount: invoicePayload.totalDiscount,
          totalTaxableAmount: invoicePayload.totalTaxableAmount,
          totalCgst: invoicePayload.totalCgst,
          totalSgst: invoicePayload.totalSgst,
          totalIgst: invoicePayload.totalIgst,
          grandTotal: invoicePayload.grandTotal,
          amountPaid: invoicePayload.amountPaid,
          amountDue: invoicePayload.amountDue,
          notes: invoicePayload.notes,
          termsConditions: invoicePayload.termsConditions
        });

        toast.success("GST Invoice Updated!", `Invoice ${invoicePayload.invoiceNumber} successfully updated.`);
      } else {
        await salesDocumentService.createDocument({
          docType,
          businessId: activeBusiness.id,
          ownerUid: user.uid,
          docNumber: invoicePayload.invoiceNumber,
          status: invoicePayload.status,
          customerId: invoicePayload.customerId,
          customerDetails: invoicePayload.customerDetails,
          issueDate: invoicePayload.issueDate,
          dueDate: invoicePayload.dueDate,
          placeOfSupply: invoicePayload.placeOfSupply,
          items: invoicePayload.items,
          subTotal: invoicePayload.subTotal,
          totalDiscount: invoicePayload.totalDiscount,
          totalTaxableAmount: invoicePayload.totalTaxableAmount,
          totalCgst: invoicePayload.totalCgst,
          totalSgst: invoicePayload.totalSgst,
          totalIgst: invoicePayload.totalIgst,
          grandTotal: invoicePayload.grandTotal,
          amountPaid: invoicePayload.amountPaid,
          amountDue: invoicePayload.amountDue,
          notes: invoicePayload.notes,
          termsConditions: invoicePayload.termsConditions
        });

        toast.success("GST Invoice Saved!", `Invoice ${invoicePayload.invoiceNumber} successfully created.`);
      }
      
      setEditingInvoiceId(null);
      setViewMode("list");
    } catch (err: any) {
      console.error(err);
      toast.error("Error Saving", err.message || "Could not save document.");
    }
  };

  // Void/Delete invoice permanent
  const handleDeleteInvoice = async (id: string, number: string) => {
    if (!user || !activeBusiness) return;

    try {
      await salesDocumentService.deleteDocument(id);
      toast.success("Invoice Deleted", `Invoice ${number} was deleted permanently.`);
    } catch (err: any) {
      console.error(err);
      toast.error("Error Deleting", err.message || "Could not delete document.");
    }
  };

  // Toggle invoice status Paid / Unpaid
  const handleTogglePaidStatus = async (inv: InvoiceState) => {
    if (!user || !activeBusiness) return;

    const nextStatus = inv.status === "paid" ? "sent" : "paid";
    const amountPaid = nextStatus === "paid" ? calculateInvoiceMath(inv).grandTotal : 0;
    const amountDue = nextStatus === "paid" ? 0 : calculateInvoiceMath(inv).grandTotal;

    try {
      await salesDocumentService.updateDocument(inv.id, docType, {
        status: nextStatus,
        amountPaid,
        amountDue
      });

      toast.success(
        nextStatus === "paid" ? "Invoice Settled" : "Invoice Sent Outstanding",
        `Invoice ${inv.invoiceNumber} payment classification updated.`
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Error Updating", err.message || "Could not update status.");
    }
  };

  // Recalculating totals over currently loaded invoice collection
  const listTotals = invoices.reduce((acc, current) => {
    const math = calculateInvoiceMath(current);
    acc.count += 1;
    if (current.status === "paid") acc.paidTotal += math.grandTotal;
    if (current.status === "sent") acc.outstandingTotal += math.grandTotal;
    if (current.status === "overdue") acc.overdueTotal += math.grandTotal;
    return acc;
  }, { count: 0, paidTotal: 0, outstandingTotal: 0, overdueTotal: 0 });

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || inv.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Numbers to Indian words converter for formal invoices
  function numberToWords(num: number): string {
    const a = [
      '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
      'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function numToWords(n: number, s: string): string {
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
    out += numToWords(Math.floor(amount / 10000000), 'Crore ');
    out += numToWords(Math.floor((amount / 100000) % 100), 'Lakh ');
    out += numToWords(Math.floor((amount / 1000) % 100), 'Thousand ');
    out += numToWords(Math.floor((amount / 100) % 10), 'Hundred ');
    if (amount > 100 && amount % 100) {
      out += 'and ';
    }
    out += numToWords(amount % 100, '');
    return out + 'Rupees Only';
  }

  // Create preview calculations
  const previewMath = viewMode === "create" ? calculateInvoiceMath({
    items: invItems,
    placeOfSupply: invPlaceOfSupply,
    discountGlobal: invDiscountGlobal
  }) : null;

  return (
    <div className="space-y-6">
      {/* List Mode Layout */}
      {viewMode === "list" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-6 h-6 text-indigo-500" /> B2B Tax Invoices
              </h1>
              <p className="text-sm text-slate-500">Raise, manage, and settle India GST compliance invoices with instant QR generation.</p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                icon={<Download className="w-4 h-4" />} 
                onClick={() => {
                  if (invoices.length === 0) {
                    toast.info("No Invoices", "There are no outward supplies raised to compile in GSTR-1.");
                    return;
                  }
                  downloadGSTR1CSV(invoices, businessGstin);
                  toast.success("CSV Downloaded", "Your GSTR-1 outward returns spreadsheet has been compiled and downloaded.");
                }}
              >
                Export GSTR-1
              </Button>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={initCreateMode}>
                Create {docConfig.singular}
              </Button>
            </div>
          </div>

          {/* Dynamic Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors" onClick={() => setFilterStatus("all")}>
              <p className="text-xs font-semibold text-slate-400 uppercase">Invoices Created</p>
              <h3 className="text-xl font-bold font-display mt-1 text-slate-900 dark:text-white">{listTotals.count} Raised</h3>
            </Card>
            <Card className="p-4 cursor-pointer border-l-4 border-l-emerald-500 hover:shadow-sm transition-all" onClick={() => setFilterStatus("paid")}>
              <p className="text-xs font-semibold text-emerald-500 uppercase">Settled Paid</p>
              <h3 className="text-xl font-bold font-display mt-1 text-emerald-600 dark:text-emerald-400">{formatINR(listTotals.paidTotal)}</h3>
            </Card>
            <Card className="p-4 cursor-pointer border-l-4 border-l-indigo-500 hover:shadow-sm transition-all" onClick={() => setFilterStatus("sent")}>
              <p className="text-xs font-semibold text-indigo-500 uppercase">Outstanding Sent</p>
              <h3 className="text-xl font-bold font-display mt-1 text-indigo-600 dark:text-indigo-400">{formatINR(listTotals.outstandingTotal)}</h3>
            </Card>
            <Card className="p-4 cursor-pointer border-l-4 border-l-rose-500 hover:shadow-sm transition-all" onClick={() => setFilterStatus("overdue")}>
              <p className="text-xs font-semibold text-rose-500 uppercase">Overdue Receivables</p>
              <h3 className="text-xl font-bold font-display mt-1 text-rose-600 dark:text-rose-400">{formatINR(listTotals.overdueTotal)}</h3>
            </Card>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <div className="w-full md:flex-1">
              <Input
                placeholder="Search by recipient or invoice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
            <div className="flex w-full md:w-auto gap-2">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Invoices</option>
                <option value="sent">Outstanding Only</option>
                <option value="paid">Paid Settlements</option>
                <option value="overdue">Overdue Payments</option>
              </select>
            </div>
          </div>

          {/* Invoice Table list */}
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-16 bg-slate-100 dark:bg-slate-900/60 rounded animate-pulse" />
              <div className="h-16 bg-slate-100 dark:bg-slate-900/60 rounded animate-pulse" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-12 h-12 text-slate-300" />}
              title="No Invoices Located"
              description="Create standard invoices with precise IGST/CGST rules and dynamic QR code setups."
              action={<Button variant="primary" onClick={initCreateMode}>Create {docConfig.singular}</Button>}
            />
          ) : (
            <Card className="p-0 overflow-hidden border border-slate-200/60 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/60">
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice No.</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Recipient Client</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Issue Date</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Grand Total</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {filteredInvoices.map((inv) => {
                      const math = calculateInvoiceMath(inv);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <td className="p-4 text-sm font-bold font-mono text-slate-900 dark:text-slate-100">{inv.invoiceNumber}</td>
                          <td className="p-4">
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{inv.customerName}</div>
                            {inv.customerGstin && <div className="text-[10px] font-mono font-bold text-slate-400 uppercase mt-0.5">GSTIN: {inv.customerGstin}</div>}
                          </td>
                          <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{inv.date}</td>
                          <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{inv.dueDate}</td>
                          <td className="p-4 text-sm font-bold font-mono text-slate-800 dark:text-slate-100">{formatINR(math.grandTotal)}</td>
                          <td className="p-4">
                            {inv.status === "paid" && <Badge variant="success"><CheckCircle className="w-3 h-3" /> Paid</Badge>}
                            {inv.status === "sent" && <Badge variant="primary"><Send className="w-3 h-3" /> Sent</Badge>}
                            {inv.status === "overdue" && <Badge variant="danger"><ShieldAlert className="w-3 h-3" /> Overdue</Badge>}
                            {inv.status === "draft" && <Badge variant="neutral"><SlidersHorizontal className="w-3 h-3" /> Draft</Badge>}
                          </td>
                          <td className="p-4 text-right flex justify-end gap-1.5">
                            <button 
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setViewMode("preview");
                              }}
                              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 cursor-pointer"
                              title="View & Manage Invoice Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleTogglePaidStatus(inv)}
                              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 cursor-pointer"
                              title="Toggle Paid/Outstanding"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-400 cursor-pointer"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Invoice Creator Workspace */}
      {viewMode === "create" && (
        <form onSubmit={handleSaveInvoice} className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => setViewMode("list")} 
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-xl font-bold font-display text-slate-900 dark:text-white">New Tax Invoice Workspace</h1>
                <p className="text-xs text-slate-400 mt-0.5">Creating GST Compliant Invoice: <span className="font-mono font-bold text-indigo-500">{invNumber}</span></p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setViewMode("list")}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" icon={<Check className="w-4 h-4" />}>
                Save & Issue Invoice
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form inputs */}
            <div className="lg:col-span-7 space-y-6">
              {/* Client and State details */}
              <Card className="space-y-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                  1. Recipient & Supply State Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recipient Client *</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.companyName || c.name}</option>
                      ))}
                      <option value="custom">-- Custom Client / Retail Spot Cash --</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Place of Supply (State / UT) *</label>
                    <select
                      value={invPlaceOfSupply}
                      onChange={(e) => setInvPlaceOfSupply(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                    >
                      {STATES_LIST.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Client Sub-form */}
                {selectedCustomerId === "custom" && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-3.5 animate-fadeIn">
                    <p className="text-xs text-indigo-500 font-bold flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" /> Spot Cash / B2C Customer Billing
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Client Contact / Trade Name *"
                        placeholder="Nirmaan Enterprises"
                        value={customCustomerName}
                        onChange={(e) => setCustomCustomerName(e.target.value)}
                        size="sm"
                      />
                      <Input
                        label="Client GSTIN (optional)"
                        placeholder="27AABCN1234A1Z1"
                        value={customCustomerGstin}
                        onChange={(e) => setCustomCustomerGstin(e.target.value)}
                        className="font-mono"
                        size="sm"
                      />
                      <Input
                        label="Client Billing Email"
                        placeholder="billing@nirmaan.com"
                        value={customCustomerEmail}
                        onChange={(e) => setCustomCustomerEmail(e.target.value)}
                        size="sm"
                      />
                      <Input
                        label="Client Billing Phone"
                        placeholder="+91 99009 90099"
                        value={customCustomerPhone}
                        onChange={(e) => setCustomCustomerPhone(e.target.value)}
                        size="sm"
                      />
                    </div>
                    <Input
                      label="Street Address / State Location"
                      placeholder="102, Industrial Hub, Sector 2"
                      value={customCustomerAddress}
                      onChange={(e) => setCustomCustomerAddress(e.target.value)}
                      size="sm"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Invoice ID Number"
                    placeholder="GATHEX/2026/004"
                    value={invNumber}
                    onChange={(e) => setInvNumber(e.target.value)}
                    required
                    className="font-mono text-xs font-bold"
                  />
                  <Input
                    label="Issue Date"
                    type="date"
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    required
                  />
                  <Input
                    label="Due Date"
                    type="date"
                    value={invDueDate}
                    onChange={(e) => setInvDueDate(e.target.value)}
                    required
                  />
                </div>
              </Card>

              {/* Line Items Editor Card */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    2. Product & Service Line Items
                  </h3>
                  <Button type="button" variant="secondary" className="px-3.5 py-1.5 text-xs font-bold" icon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddFieldRow}>
                    Add Line
                  </Button>
                </div>

                <div className="space-y-4">
                  {invItems.map((item, index) => (
                    <div 
                      key={index}
                      className="p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-3 relative"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveFieldRow(index)}
                        className="absolute top-4 right-4 p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Remove line item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catalog Item Selection</label>
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemProductChange(index, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                            <option value="custom">-- Custom Product / Service --</option>
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Detailed Label / Description</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...invItems];
                              updated[index].name = e.target.value;
                              setInvItems(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                            placeholder="Consultancy Charges / Description"
                          />
                        </div>

                        <div className="sm:col-span-3 pr-8">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">HSN / SAC</label>
                          <input
                            type="text"
                            value={item.hsnSacCode}
                            onChange={(e) => {
                              const updated = [...invItems];
                              updated[index].hsnSacCode = e.target.value;
                              setInvItems(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none font-bold animate-fadeIn"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Base Price (INR)</label>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const updated = [...invItems];
                              updated[index].price = Math.max(0, Number(e.target.value));
                              setInvItems(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...invItems];
                              updated[index].quantity = Math.max(1, Number(e.target.value));
                              setInvItems(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unit</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => {
                              const updated = [...invItems];
                              updated[index].unit = e.target.value;
                              setInvItems(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Row Discount (₹)</label>
                          <input
                            type="number"
                            value={item.discountAmount}
                            onChange={(e) => {
                              const updated = [...invItems];
                              updated[index].discountAmount = Math.max(0, Number(e.target.value));
                              setInvItems(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">GST Slabs</label>
                          <select
                            value={item.gstRate}
                            onChange={(e) => {
                              const updated = [...invItems];
                              updated[index].gstRate = Number(e.target.value);
                              setInvItems(updated);
                            }}
                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                          >
                            <option value="0">0% Exempt</option>
                            <option value="5">5% Slab</option>
                            <option value="12">12% Slab</option>
                            <option value="18">18% Standard</option>
                            <option value="28">28% Luxury</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Notes & Terms & Conditions Card */}
              <Card className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Additional Notes (Customer Copy)</label>
                  <textarea
                    rows={3}
                    value={invNotes}
                    onChange={(e) => setInvNotes(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Terms & Conditions</label>
                  <textarea
                    rows={3}
                    value={invTerms}
                    onChange={(e) => setInvTerms(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Lump Sum Global Discount (INR)"
                    type="number"
                    value={invDiscountGlobal}
                    onChange={(e) => setInvDiscountGlobal(Math.max(0, Number(e.target.value)))}
                    leftIcon={<Percent className="w-4 h-4 text-slate-400" />}
                  />
                </div>
              </Card>
            </div>

            {/* Right Column: Live PDF Mockup */}
            <div className="lg:col-span-5 sticky top-24">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 font-display flex items-center gap-1.5 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-500" /> Real-time GST Invoice Mockup
              </h4>
              
              <div className="bg-white text-slate-800 p-6 rounded-2xl shadow-xl border border-slate-200/60 max-h-[80vh] overflow-y-auto space-y-4 font-sans text-xs select-none">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h5 className="font-black text-slate-900 tracking-tight text-sm font-display">TAX INVOICE</h5>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold">{businessName}</p>
                    <p className="text-[9px] text-slate-400 max-w-[200px] leading-relaxed mt-0.5">{businessAddressStr}</p>
                    <p className="text-[9px] font-mono text-indigo-600 font-bold mt-1 uppercase">GSTIN: {businessGstin}</p>
                  </div>
                  <div className="text-right">
                    <h5 className="font-mono text-slate-400 font-bold text-[10px]">INVOICE NO:</h5>
                    <h6 className="font-mono font-bold text-slate-800 text-xs mt-0.5">{invNumber || "DRAFT"}</h6>
                    <p className="text-[9px] text-slate-500 mt-2 font-semibold">Date: {invDate || "N/A"}</p>
                    <p className="text-[9px] text-rose-500 font-semibold">Due: {invDueDate || "N/A"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Billed To (Recipient):</span>
                    <p className="font-bold text-slate-900 mt-1">
                      {selectedCustomerId === "custom" 
                        ? (customCustomerName || "Custom Recipient Name") 
                        : (customers.find(c => c.id === selectedCustomerId)?.companyName || customers.find(c => c.id === selectedCustomerId)?.name || "N/A")}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {selectedCustomerId === "custom" 
                        ? (customCustomerAddress || "Retail Spot Address") 
                        : (() => {
                            const c = customers.find(c => c.id === selectedCustomerId);
                            return c ? `${c.billingAddress?.street || ""}, ${c.billingAddress?.city || ""}, ${c.billingAddress?.state || ""}` : "N/A";
                          })()}
                    </p>
                    <p className="text-[9px] font-mono font-bold text-indigo-500 mt-1 uppercase">
                      GSTIN: {selectedCustomerId === "custom" ? customCustomerGstin : (customers.find(c => c.id === selectedCustomerId)?.gstin || "URD (B2C)")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Place of Supply:</span>
                    <p className="font-bold text-slate-800 mt-1">{invPlaceOfSupply}</p>
                  </div>
                </div>

                {previewMath && (
                  <div className="space-y-3">
                    <div className="border-b border-slate-100 pb-2">
                      <div className="grid grid-cols-12 font-bold text-slate-400 text-[9px] uppercase">
                        <span className="col-span-5">Description</span>
                        <span className="col-span-2 text-right">HSN</span>
                        <span className="col-span-2 text-right">Qty/Price</span>
                        <span className="col-span-3 text-right">Total (Base)</span>
                      </div>
                      <div className="divide-y divide-slate-50 mt-1.5">
                        {previewMath.computedItems.map((item, idx) => (
                          <div key={idx} className="grid grid-cols-12 py-1 text-[9px] font-medium text-slate-700">
                            <div className="col-span-5 truncate font-bold text-slate-900">{item.name}</div>
                            <div className="col-span-2 text-right font-mono font-semibold">{item.hsnSacCode}</div>
                            <div className="col-span-2 text-right font-mono text-slate-500">{item.quantity} x {item.price}</div>
                            <div className="col-span-3 text-right font-mono font-bold">{formatINR(item.rowTaxable)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 border-b border-slate-100 pb-3 text-[10px]">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-400">Taxable Supply Subtotal:</span>
                        <span className="font-mono">{formatINR(previewMath.totalTaxableAmount)}</span>
                      </div>
                      {previewMath.totalCgst > 0 && (
                        <div className="flex justify-between font-semibold text-indigo-600">
                          <span className="text-slate-400">Central Tax (CGST Sum):</span>
                          <span className="font-mono">{formatINR(previewMath.totalCgst)}</span>
                        </div>
                      )}
                      {previewMath.totalSgst > 0 && (
                        <div className="flex justify-between font-semibold text-indigo-600">
                          <span className="text-slate-400">State Tax (SGST Sum):</span>
                          <span className="font-mono">{formatINR(previewMath.totalSgst)}</span>
                        </div>
                      )}
                      {previewMath.totalIgst > 0 && (
                        <div className="flex justify-between font-semibold text-indigo-600">
                          <span className="text-slate-400">Integrated Tax (IGST Sum):</span>
                          <span className="font-mono">{formatINR(previewMath.totalIgst)}</span>
                        </div>
                      )}
                      {invDiscountGlobal > 0 && (
                        <div className="flex justify-between font-semibold text-rose-500">
                          <span className="text-slate-400">Lump Sum Global Discount:</span>
                          <span className="font-mono">-{formatINR(invDiscountGlobal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-slate-950 text-sm border-t border-slate-100 pt-2">
                        <span>GRAND TOTAL DUE:</span>
                        <span className="font-mono text-indigo-700">{formatINR(previewMath.grandTotal)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-50/50 rounded-xl flex items-center justify-between border border-indigo-100/30">
                      <div className="space-y-0.5">
                        <div className="text-[9px] font-bold text-indigo-800 uppercase flex items-center gap-1">
                          <QrCode className="w-3 h-3" /> GATHEX Instant Settlement QR
                        </div>
                        <p className="text-[8px] text-slate-400 leading-tight max-w-[170px]">Scan this dynamically generated invoice QR to clear ₹{previewMath.grandTotal.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-white p-1 rounded-md border border-indigo-100">
                        <div className="h-10 w-10 border border-slate-900 rounded flex items-center justify-center p-0.5">
                          <div className="grid grid-cols-3 gap-1 h-full w-full opacity-90">
                            <div className="bg-slate-900 rounded-sm" />
                            <div className="bg-slate-900 rounded-sm" />
                            <div className="bg-transparent" />
                            <div className="bg-transparent" />
                            <div className="bg-slate-900 rounded-sm" />
                            <div className="bg-slate-900 rounded-sm" />
                            <div className="bg-slate-900 rounded-sm" />
                            <div className="bg-transparent" />
                            <div className="bg-slate-900 rounded-sm" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Modern High-Fidelity Interactive Invoice Preview Workspace */}
      {viewMode === "preview" && selectedInvoice && (
        <DocumentPreview
            docTitle={docConfig.singular.toUpperCase()}
          invoice={selectedInvoice}
          activeBusiness={activeBusiness}
          onClose={() => {
            setViewMode("list");
            setSelectedInvoice(null);
          }}
          onEdit={() => {
            initEditMode(selectedInvoice);
          }}
          onDelete={async (id, number) => {
            await handleDeleteInvoice(id, number);
            setViewMode("list");
            setSelectedInvoice(null);
          }}
          onDuplicate={async (inv) => {
            await handleDuplicateInvoice(inv);
            setViewMode("list");
            setSelectedInvoice(null);
          }}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Printable Invoice PDF Sheet */}
      {isPrintModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-4xl bg-white text-slate-900 shadow-2xl relative flex flex-col p-0 border-none font-sans overflow-hidden my-8">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white font-display">Tax Invoice Document</h3>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  icon={<Printer className="w-4 h-4" />} 
                  onClick={() => window.print()}
                >
                  Print Invoice
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setIsPrintModalOpen(false);
                    setSelectedInvoice(null);
                  }}
                >
                  Close Document
                </Button>
              </div>
            </div>

            <div className="p-8 md:p-12 space-y-6 overflow-y-auto max-h-[75vh] print:max-h-none print:p-0 font-sans">
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">TAX INVOICE</h1>
                  <p className="text-[10px] text-indigo-600 font-bold tracking-widest uppercase mt-0.5">ORIGINAL FOR RECIPIENT</p>
                  
                  <div className="mt-4 space-y-1 text-xs text-slate-600">
                    <p className="font-extrabold text-slate-900 text-sm">{businessName}</p>
                    <p className="max-w-md leading-relaxed">{businessAddressStr}</p>
                    <p className="font-semibold">Phone: {activeBusiness?.phone || "+91 99887 76655"} | Email: {activeBusiness?.email || "accounts@gathex.com"}</p>
                    <p className="font-mono text-indigo-600 font-extrabold text-xs mt-1 uppercase">GSTIN: {businessGstin}</p>
                  </div>
                </div>

                <div className="text-right space-y-1.5">
                  <h3 className="font-mono text-slate-400 font-bold text-xs uppercase">INVOICE IDENTITY</h3>
                  <h2 className="font-mono font-black text-slate-900 text-base tracking-tight">{selectedInvoice.invoiceNumber}</h2>
                  
                  <div className="pt-2 text-xs text-slate-500 space-y-1">
                    <p><span className="font-semibold text-slate-400">Issue Date:</span> {selectedInvoice.date}</p>
                    <p className="text-rose-500"><span className="font-semibold text-slate-400">Due Date:</span> {selectedInvoice.dueDate}</p>
                    <p><span className="font-semibold text-slate-400">Place of Supply:</span> {selectedInvoice.placeOfSupply}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100 pb-5 text-xs text-slate-600">
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2">Billing Recipient</h5>
                  <p className="font-extrabold text-slate-900 text-sm">{selectedInvoice.customerName}</p>
                  <p className="mt-1 text-slate-500 leading-relaxed">{selectedInvoice.customerAddress}</p>
                  <p className="mt-1 text-slate-500">Phone: {selectedInvoice.customerPhone || "N/A"}</p>
                  {selectedInvoice.customerGstin && (
                    <p className="font-mono font-extrabold text-indigo-600 uppercase mt-1">GSTIN: {selectedInvoice.customerGstin}</p>
                  )}
                </div>

                <div className="md:text-right">
                  <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2">Transport & Shipping</h5>
                  <p className="font-bold text-slate-800">{selectedInvoice.customerName}</p>
                  <p className="mt-1 text-slate-500 leading-relaxed">{selectedInvoice.customerAddress}</p>
                </div>
              </div>

              <div className="border-b border-slate-200 pb-4 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-slate-400 font-bold">
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">Goods / Services Description</th>
                      <th className="p-3 text-center">HSN/SAC</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Discount</th>
                      <th className="p-3 text-center">GST Rate</th>
                      <th className="p-3 text-right">Taxable Supply</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {calculateInvoiceMath(selectedInvoice).computedItems.map((item, index) => (
                      <tr key={index}>
                        <td className="p-3 text-center text-slate-400">{index + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-500">{item.hsnSacCode}</td>
                        <td className="p-3 text-right font-mono">{formatINR(item.price)}</td>
                        <td className="p-3 text-center font-mono">{item.quantity} {item.unit}</td>
                        <td className="p-3 text-right font-mono text-rose-500">-{formatINR(item.discountAmount)}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{item.gstRate}%</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{formatINR(item.rowTaxable)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(() => {
                const math = calculateInvoiceMath(selectedInvoice);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start text-xs text-slate-600">
                    <div className="md:col-span-7 space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Merchant's Settlement Bank Details</h4>
                        <div className="grid grid-cols-3 gap-y-1 text-slate-500 text-[11px]">
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

                      <p className="text-[10px] text-slate-400 italic leading-relaxed">
                        Amount in words: <span className="font-bold text-slate-600 not-italic uppercase">{numberToWords(math.grandTotal)}</span>
                      </p>
                    </div>

                    <div className="md:col-span-5 space-y-2 text-[11px] text-slate-500">
                      <div className="flex justify-between">
                        <span>Pre-tax Supply Value:</span>
                        <span className="font-mono font-semibold text-slate-800">{formatINR(math.subTotal)}</span>
                      </div>
                      {math.totalDiscount > 0 && (
                        <div className="flex justify-between text-rose-500">
                          <span>Total Discount Deducted:</span>
                          <span className="font-mono">-{formatINR(math.totalDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                        <span>Taxable Supplies Value:</span>
                        <span className="font-mono">{formatINR(math.totalTaxableAmount)}</span>
                      </div>
                      
                      {math.totalCgst > 0 && (
                        <div className="flex justify-between text-indigo-600 font-semibold">
                          <span>Central Tax (CGST):</span>
                          <span className="font-mono">{formatINR(math.totalCgst)}</span>
                        </div>
                      )}
                      {math.totalSgst > 0 && (
                        <div className="flex justify-between text-indigo-600 font-semibold">
                          <span>State Tax (SGST):</span>
                          <span className="font-mono">{formatINR(math.totalSgst)}</span>
                        </div>
                      )}
                      {math.totalIgst > 0 && (
                        <div className="flex justify-between text-indigo-600 font-semibold">
                          <span>Integrated Tax (IGST):</span>
                          <span className="font-mono">{formatINR(math.totalIgst)}</span>
                        </div>
                      )}
                      
                      {math.roundOff !== 0 && (
                        <div className="flex justify-between text-slate-400 text-[10px]">
                          <span>Invoice Round-off:</span>
                          <span className="font-mono">{math.roundOff > 0 ? "+" : ""}{math.roundOff.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-black text-sm text-indigo-700 border-t border-slate-200 pt-2.5">
                        <span className="text-slate-900 font-display">GRAND TOTAL PAYABLE:</span>
                        <span className="font-mono">{formatINR(math.grandTotal)}</span>
                      </div>

                      <div className="border border-slate-100 rounded-xl p-3 bg-indigo-50/20 flex items-center justify-between gap-4 mt-4 print:hidden">
                        <div className="space-y-1">
                          <h5 className="font-bold text-indigo-900 uppercase tracking-wider text-[9px] flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5" /> GATHEX UPI Quick Pay
                          </h5>
                          <p className="text-[8px] text-slate-400 leading-normal max-w-[150px]">
                            Scan from any merchant application (BHIM, GooglePay, PhonePe) to settle.
                          </p>
                          <p className="font-mono text-[9px] font-bold text-slate-600">UPI VPA: {businessUpi}</p>
                        </div>
                        <div className="p-1 bg-white rounded-lg border border-indigo-100/40">
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
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-200 text-[10px] text-slate-500">
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-700">Declarations:</h5>
                  <p className="leading-relaxed text-[9px]">
                    We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct. Taxes have been computed as per standard Indian GST provisions.
                  </p>
                </div>
                <div className="md:text-right flex flex-col justify-between h-20 items-end">
                  <p className="font-bold text-slate-700">for {businessName}:</p>
                  <div className="text-center">
                    <div className="border-t border-slate-300 w-36 pt-1 font-bold text-slate-400 uppercase tracking-widest text-[8px]">
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
