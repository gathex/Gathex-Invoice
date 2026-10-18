import { SalesDocType } from "../types";
import { InvoicePreferences } from "../services/businessService";

export interface DocStatusOption {
  value: string;
  label: string;
}

export interface DocTypeConfig {
  docType: SalesDocType;
  singular: string;
  plural: string;
  routePath: string;
  prefix: string;
  pageTitle: string;
  workspaceTitle: string;
  editWorkspaceTitle: string;
  pageSubtitle: string;
  numberLabel: string;
  dateLabel: string;
  secondDateLabel: string | null;
  secondDateRequired: boolean;
  totalLabel: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  previewHeading: string;
  partyLabel: string;
  partySelectPlaceholder: string;
  createButton: string;
  showPaymentQR: boolean;
  showBalanceDue: boolean;
  showBankDetails: boolean;
  requiresLinkedInvoice: boolean;
  showVehicleSection: boolean;
  showTotals: boolean;
  canConvertToInvoice: boolean;
  statusOptions: DocStatusOption[];
}

export const DOC_TYPE_CONFIG: Record<SalesDocType, DocTypeConfig> = {
  quotation: {
    docType: "quotation",
    singular: "Quotation",
    plural: "Quotations",
    routePath: "quotations",
    prefix: "QT",
    pageTitle: "Quotations",
    workspaceTitle: "New Quotation Workspace",
    editWorkspaceTitle: "Edit Quotation Workspace",
    pageSubtitle: "Draft price estimates and proposals for your prospective clients.",
    numberLabel: "Quotation Number",
    dateLabel: "Quotation Date",
    secondDateLabel: "Valid Until",
    secondDateRequired: false,
    totalLabel: "Quotation Total",
    primaryButtonText: "Save Quotation",
    secondaryButtonText: "Save as Draft",
    previewHeading: "QUOTATION",
    partyLabel: "Customer",
    partySelectPlaceholder: "Select recipient customer...",
    createButton: "Create Quotation",
    showPaymentQR: false,
    showBalanceDue: false,
    showBankDetails: false,
    requiresLinkedInvoice: false,
    showVehicleSection: false,
    showTotals: true,
    canConvertToInvoice: true,
    statusOptions: [
      { value: "draft", label: "Draft" },
      { value: "sent", label: "Sent" },
      { value: "accepted", label: "Accepted" },
      { value: "rejected", label: "Rejected" },
      { value: "expired", label: "Expired" },
      { value: "converted", label: "Converted" }
    ]
  },
  proforma_invoice: {
    docType: "proforma_invoice",
    singular: "Proforma Invoice",
    plural: "Proforma Invoices",
    routePath: "proforma-invoices",
    prefix: "PI",
    pageTitle: "Proforma Invoices",
    workspaceTitle: "New Proforma Invoice Workspace",
    editWorkspaceTitle: "Edit Proforma Invoice Workspace",
    pageSubtitle: "Issue preliminary commercial invoices prior to final goods dispatch.",
    numberLabel: "Proforma Number",
    dateLabel: "Proforma Date",
    secondDateLabel: "Valid Until",
    secondDateRequired: false,
    totalLabel: "Proforma Total",
    primaryButtonText: "Save Proforma",
    secondaryButtonText: "Save as Draft",
    previewHeading: "PROFORMA INVOICE",
    partyLabel: "Customer",
    partySelectPlaceholder: "Select recipient customer...",
    createButton: "Create Proforma",
    showPaymentQR: false,
    showBalanceDue: false,
    showBankDetails: true,
    requiresLinkedInvoice: false,
    showVehicleSection: false,
    showTotals: true,
    canConvertToInvoice: true,
    statusOptions: [
      { value: "draft", label: "Draft" },
      { value: "sent", label: "Sent" },
      { value: "accepted", label: "Accepted" },
      { value: "rejected", label: "Rejected" },
      { value: "expired", label: "Expired" },
      { value: "converted", label: "Converted" }
    ]
  },
  invoice: {
    docType: "invoice",
    singular: "Tax Invoice",
    plural: "Invoices",
    routePath: "invoices",
    prefix: "INV",
    pageTitle: "Invoices",
    workspaceTitle: "New Tax Invoice Workspace",
    editWorkspaceTitle: "Edit Tax Invoice Workspace",
    pageSubtitle: "Generate GST-compliant tax invoices, track settlements, and record payments.",
    numberLabel: "Invoice ID Number",
    dateLabel: "Issue Date",
    secondDateLabel: "Due Date",
    secondDateRequired: true,
    totalLabel: "Grand Total Due",
    primaryButtonText: "Save & Issue Invoice",
    secondaryButtonText: "Save as Draft",
    previewHeading: "TAX INVOICE",
    partyLabel: "Customer",
    partySelectPlaceholder: "Select recipient customer...",
    createButton: "Create Invoice",
    showPaymentQR: true,
    showBalanceDue: true,
    showBankDetails: true,
    requiresLinkedInvoice: false,
    showVehicleSection: false,
    showTotals: true,
    canConvertToInvoice: false,
    statusOptions: [
      { value: "draft", label: "Draft" },
      { value: "sent", label: "Sent" },
      { value: "partially_paid", label: "Partially Paid" },
      { value: "paid", label: "Paid" },
      { value: "overdue", label: "Overdue" },
      { value: "void", label: "Void" },
      { value: "cancelled", label: "Cancelled" }
    ]
  },
  credit_note: {
    docType: "credit_note",
    singular: "Credit Note",
    plural: "Credit Notes",
    routePath: "credit-notes",
    prefix: "CN",
    pageTitle: "Credit Notes",
    workspaceTitle: "New Credit Note Workspace",
    editWorkspaceTitle: "Edit Credit Note Workspace",
    pageSubtitle: "Issue credit adjustments and sales return acknowledgments against tax invoices.",
    numberLabel: "Credit Note Number",
    dateLabel: "Credit Note Date",
    secondDateLabel: null,
    secondDateRequired: false,
    totalLabel: "Total Credit Amount",
    primaryButtonText: "Issue Credit Note",
    secondaryButtonText: "Save as Draft",
    previewHeading: "CREDIT NOTE",
    partyLabel: "Customer",
    partySelectPlaceholder: "Select customer...",
    createButton: "Create Credit Note",
    showPaymentQR: false,
    showBalanceDue: false,
    showBankDetails: false,
    requiresLinkedInvoice: true,
    showVehicleSection: false,
    showTotals: true,
    canConvertToInvoice: false,
    statusOptions: [
      { value: "draft", label: "Draft" },
      { value: "issued", label: "Issued" },
      { value: "applied", label: "Applied" },
      { value: "void", label: "Void" },
      { value: "cancelled", label: "Cancelled" }
    ]
  },
  debit_note: {
    docType: "debit_note",
    singular: "Debit Note",
    plural: "Debit Notes",
    routePath: "debit-notes",
    prefix: "DN",
    pageTitle: "Debit Notes",
    workspaceTitle: "New Debit Note Workspace",
    editWorkspaceTitle: "Edit Debit Note Workspace",
    pageSubtitle: "Issue supplemental tax charges or upward rate adjustments against existing invoices.",
    numberLabel: "Debit Note Number",
    dateLabel: "Debit Note Date",
    secondDateLabel: null,
    secondDateRequired: false,
    totalLabel: "Total Debit Amount",
    primaryButtonText: "Issue Debit Note",
    secondaryButtonText: "Save as Draft",
    previewHeading: "DEBIT NOTE",
    partyLabel: "Customer",
    partySelectPlaceholder: "Select customer...",
    createButton: "Create Debit Note",
    showPaymentQR: false,
    showBalanceDue: false,
    showBankDetails: false,
    requiresLinkedInvoice: true,
    showVehicleSection: false,
    showTotals: true,
    canConvertToInvoice: false,
    statusOptions: [
      { value: "draft", label: "Draft" },
      { value: "issued", label: "Issued" },
      { value: "applied", label: "Applied" },
      { value: "void", label: "Void" },
      { value: "cancelled", label: "Cancelled" }
    ]
  },
  delivery_challan: {
    docType: "delivery_challan",
    singular: "Delivery Challan",
    plural: "Delivery Challans",
    routePath: "delivery-challans",
    prefix: "DC",
    pageTitle: "Delivery Challans",
    workspaceTitle: "New Delivery Challan Workspace",
    editWorkspaceTitle: "Edit Delivery Challan Workspace",
    pageSubtitle: "Accompany goods transportation for job work, supply on approval, or multi-stage dispatch.",
    numberLabel: "Challan Number",
    dateLabel: "Challan Date",
    secondDateLabel: "Expected Delivery",
    secondDateRequired: false,
    totalLabel: "Total Declared Value",
    primaryButtonText: "Generate Delivery Challan",
    secondaryButtonText: "Save as Draft",
    previewHeading: "DELIVERY CHALLAN",
    partyLabel: "Customer",
    partySelectPlaceholder: "Select consignee customer...",
    createButton: "Create Delivery Challan",
    showPaymentQR: false,
    showBalanceDue: false,
    showBankDetails: false,
    requiresLinkedInvoice: false,
    showVehicleSection: true,
    showTotals: false,
    canConvertToInvoice: false,
    statusOptions: [
      { value: "draft", label: "Draft" },
      { value: "dispatched", label: "Dispatched" },
      { value: "delivered", label: "Delivered" },
      { value: "cancelled", label: "Cancelled" }
    ]
  },
  purchase_order: {
    docType: "purchase_order",
    singular: "Purchase Order",
    plural: "Purchase Orders",
    routePath: "purchase-orders",
    prefix: "PO",
    pageTitle: "Purchase Orders",
    workspaceTitle: "New Purchase Order Workspace",
    editWorkspaceTitle: "Edit Purchase Order Workspace",
    pageSubtitle: "Issue procurement requests, rate commitments, and authorized purchase contracts to vendors.",
    numberLabel: "PO Number",
    dateLabel: "Order Date",
    secondDateLabel: "Expected Delivery",
    secondDateRequired: false,
    totalLabel: "Order Total",
    primaryButtonText: "Issue Purchase Order",
    secondaryButtonText: "Save as Draft",
    previewHeading: "PURCHASE ORDER",
    partyLabel: "Vendor",
    partySelectPlaceholder: "Select or enter vendor details...",
    createButton: "Create Purchase Order",
    showPaymentQR: false,
    showBalanceDue: false,
    showBankDetails: false,
    requiresLinkedInvoice: false,
    showVehicleSection: false,
    showTotals: true,
    canConvertToInvoice: false,
    statusOptions: [
      { value: "draft", label: "Draft" },
      { value: "sent", label: "Sent" },
      { value: "received", label: "Received" },
      { value: "cancelled", label: "Cancelled" }
    ]
  }
};

export function docTypeFromPath(path: string): SalesDocType {
  const clean = path.replace(/^#\/?/, "").split("?")[0];
  if (clean.startsWith("quotation")) return "quotation";
  if (clean.startsWith("proforma")) return "proforma_invoice";
  if (clean.startsWith("credit-note")) return "credit_note";
  if (clean.startsWith("debit-note")) return "debit_note";
  if (clean.startsWith("delivery-challan")) return "delivery_challan";
  if (clean.startsWith("purchase-order")) return "purchase_order";
  if (clean.startsWith("invoice")) return "invoice";
  return "invoice";
}

export function resolveConfig(
  docType: SalesDocType,
  invoicePrefs?: InvoicePreferences | null
): DocTypeConfig {
  const base = DOC_TYPE_CONFIG[docType] || DOC_TYPE_CONFIG.invoice;

  // Invoice preferences apply to invoices ONLY
  if (docType === "invoice" && invoicePrefs) {
    return {
      ...base,
      prefix: invoicePrefs.prefix || base.prefix,
    };
  }

  return base;
}
