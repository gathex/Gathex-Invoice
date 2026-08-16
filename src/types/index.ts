/**
 * GATHEX Invoice - Type Definitions
 * Designed for Indian GST compliance and SaaS architecture
 */

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
  activeBusinessId?: string;
  subscriptionTier?: 'free' | 'starter' | 'growth' | string;
  phone?: string;
  language?: string;
  themePreference?: 'light' | 'dark' | 'system';
}

export interface BusinessDetails {
  id: string;
  ownerUid: string;
  name: string;
  tradeName?: string; // Legal trade name
  invoiceTheme?: "modern" | "classic" | "minimal" | "bold";
  gstin?: string; // GSTIN for India (15-digit)
  email: string;
  phone: string;
  website?: string;
  address: {
    street: string;
    city: string;
    state: string; // Indian State
    postalCode: string;
    country: string; // India by default
  };
  logoUrl?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifsc: string; // IFSC Code for India
    branch: string;
  };
  upiId?: string; // For generating UPI QR Codes
  pan?: string; // Permanent Account Number
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  businessId: string;
  ownerUid: string;
  name: string;
  companyName?: string;
  gstin?: string; // Customer's GSTIN if applicable (B2B vs B2C)
  email: string;
  phone: string;
  billingAddress: Address;
  shippingAddress?: Address;
  createdAt: Date;
  updatedAt: Date;
  isArchived?: boolean; // Archived ledger status
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ProductService {
  id: string;
  businessId: string;
  ownerUid: string;
  type: 'product' | 'service';
  name: string;
  skuCode?: string; // SKU or HSN/SAC Code
  hsnSacCode?: string; // HSN Code for Products, SAC Code for Services
  description?: string;
  price: number;
  unit: string; // e.g., Pcs, Box, Kg, Hours, Days
  gstRate: number; // e.g., 0, 5, 12, 18, 28 percent
  cessRate?: number; // Additional cess percent if applicable
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  hsnSacCode?: string;
  quantity: number;
  price: number; // Unit price before tax
  unit: string;
  discountAmount: number; // Discount in INR
  gstRate: number; // GST rate in percentage (e.g. 18)
  cgstAmount: number; // Central GST
  sgstAmount: number; // State GST
  igstAmount: number; // Integrated GST (if interstate)
  totalAmount: number; // Final total for this line item
}

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'void';

export interface Invoice {
  id: string;
  businessId: string;
  ownerUid: string;
  invoiceNumber: string; // e.g., GATHEX/2026/001
  status: InvoiceStatus;
  customerId: string;
  customerDetails: {
    name: string;
    companyName?: string;
    gstin?: string;
    email: string;
    phone: string;
    address: Address;
  };
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  
  // Tax calculations
  subTotal: number; // Total price before tax and discount
  totalDiscount: number; // Total discount in INR
  totalTaxableAmount: number; // SubTotal - Discount
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess?: number;
  grandTotal: number; // Total payable
  
  roundOff?: number; // Round off amount to make total integer
  notes?: string;
  termsConditions?: string;
  
  // Payments reference
  amountPaid: number;
  amountDue: number;
  paymentUpiQrUrl?: string; // Generated UPI dynamic QR code string
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'partially_paid' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded' | 'overdue';


export interface Expense {
  id: string;
  businessId: string;
  ownerUid: string;
  category: string; // e.g. Rent, Salaries, Office, Software
  amount: number;
  expenseDate: Date;
  gstPaid?: number;
  gstinOfSupplier?: string;
  paymentMethod: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: Date;
}

// ==========================================
// Phase 4 Sales Document Type Definitions
// ==========================================

export type SalesDocType = 
  | 'invoice' 
  | 'quotation' 
  | 'proforma_invoice' 
  | 'credit_note' 
  | 'debit_note' 
  | 'delivery_challan' 
  | 'purchase_order';

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type ProformaStatus = 'draft' | 'sent' | 'converted' | 'paid';
export type CreditNoteStatus = 'draft' | 'issued' | 'applied';
export type DebitNoteStatus = 'draft' | 'issued' | 'applied';
export type DeliveryChallanStatus = 'draft' | 'dispatched' | 'delivered' | 'cancelled' | 'converted';
export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface Quotation {
  id: string;
  businessId: string;
  ownerUid: string;
  quotationNumber: string;
  status: QuotationStatus;
  customerId: string;
  customerDetails: {
    name: string;
    companyName?: string;
    gstin?: string;
    email: string;
    phone: string;
    address: Address;
  };
  issueDate: Date;
  expiryDate: Date;
  items: InvoiceItem[];
  subTotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess?: number;
  grandTotal: number;
  notes?: string;
  termsConditions?: string;
  convertedInvoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProformaInvoice {
  id: string;
  businessId: string;
  ownerUid: string;
  proformaNumber: string;
  status: ProformaStatus;
  customerId: string;
  customerDetails: {
    name: string;
    companyName?: string;
    gstin?: string;
    email: string;
    phone: string;
    address: Address;
  };
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subTotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess?: number;
  grandTotal: number;
  notes?: string;
  termsConditions?: string;
  convertedInvoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditNote {
  id: string;
  businessId: string;
  ownerUid: string;
  creditNoteNumber: string;
  invoiceId: string; // linked invoice
  invoiceNumber: string;
  customerId: string;
  customerDetails: {
    name: string;
    companyName?: string;
    gstin?: string;
    email: string;
    phone: string;
    address: Address;
  };
  issueDate: Date;
  reason: string;
  refundAmount?: number;
  adjustmentAmount?: number;
  gstAdjustment?: number;
  items: InvoiceItem[];
  subTotal: number;
  totalDiscount?: number;
  totalTaxableAmount: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  totalCess?: number;
  grandTotal: number;
  status: CreditNoteStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebitNote {
  id: string;
  businessId: string;
  ownerUid: string;
  debitNoteNumber: string;
  invoiceId: string; // linked invoice
  invoiceNumber: string;
  customerId: string;
  customerDetails: {
    name: string;
    companyName?: string;
    gstin?: string;
    email: string;
    phone: string;
    address: Address;
  };
  issueDate: Date;
  reason: string;
  adjustmentAmount?: number;
  gstAdjustment?: number;
  items: InvoiceItem[];
  subTotal: number;
  totalDiscount?: number;
  totalTaxableAmount: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  totalCess?: number;
  grandTotal: number;
  status: DebitNoteStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryChallan {
  id: string;
  businessId: string;
  ownerUid: string;
  challanNumber: string;
  customerId: string;
  customerDetails: {
    name: string;
    companyName?: string;
    gstin?: string;
    email: string;
    phone: string;
    address: Address;
  };
  issueDate: Date;
  items: InvoiceItem[];
  vehicleDetails: {
    vehicleNumber: string;
    transporterName?: string;
    lrNumber?: string;
  };
  deliveryAddress: Address;
  status: DeliveryChallanStatus;
  subTotal: number;
  totalDiscount?: number;
  totalTaxableAmount?: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  totalCess?: number;
  grandTotal: number;
  notes?: string;
  termsConditions?: string;
  convertedInvoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrder {
  id: string;
  businessId: string;
  ownerUid: string;
  poNumber: string;
  vendorName: string;
  vendorGstin?: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorAddress?: Address;
  issueDate: Date;
  expectedDelivery: Date;
  items: InvoiceItem[];
  subTotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess?: number;
  grandTotal: number;
  status: PurchaseOrderStatus;
  notes?: string;
  termsConditions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentActivity {
  id: string;
  businessId: string;
  ownerUid: string;
  documentId: string;
  documentType: SalesDocType;
  documentNumber: string;
  action: string; // 'created' | 'updated' | 'deleted' | 'converted' | 'sent' | 'accepted' | 'rejected' | 'payment_added'
  description: string;
  userId: string;
  userName: string;
  timestamp: Date;
}


export interface PaymentMethodConfig {
  id: string;
  businessId: string;
  ownerUid: string;
  methodType: 'cash' | 'upi' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'cheque' | 'wallet' | 'store_credit' | 'offline' | 'mixed';
  displayName: string;
  description?: string;
  icon?: string;
  isEnabled: boolean;
  displayOrder: number;
  isDefault: boolean;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTransaction {
  id: string;
  paymentId: string;
  businessId: string;
  invoiceId: string;
  customerId: string;
  ownerUid: string;
  methodType: string;
  amount: number;
  currency: string;
  transactionId?: string; // e.g. UPI ID, Card Last 4
  referenceNumber?: string; // e.g. Bank UTR, Cheque No
  bankName?: string;
  chequeDetails?: {
    chequeNumber: string;
    issueDate: Date;
    depositDate?: Date;
    clearanceStatus: 'pending' | 'cleared' | 'bounced';
  };
  cardDetails?: {
    cardBrand: string;
    last4: string;
    authCode: string;
  };
  walletName?: string;
  offlineDetails?: {
    collectionLocation: string;
    receivedBy: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  businessId: string;
  ownerUid: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number; // Total amount paid in this receipt
  currency: string;
  paymentDate: Date;
  paymentMethod: string; // 'cash', 'upi', 'mixed', etc.
  paymentType: string;
  status: PaymentStatus;
  transactionId?: string;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentAttachment {
  id: string;
  paymentId: string;
  transactionId?: string;
  businessId: string;
  invoiceId: string;
  customerId: string;
  ownerUid: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: Date;
}

export interface PaymentAuditLog {
  id: string;
  paymentId: string;
  businessId: string;
  invoiceId: string;
  customerId: string;
  ownerUid: string;
  action: 'created' | 'updated' | 'deleted' | 'refunded' | 'status_changed';
  description: string;
  previousStatus?: string;
  newStatus?: string;
  performedBy: string;
  timestamp: Date;
}

export interface UPIConfig {
  id: string;
  businessId: string;
  ownerUid: string;
  primaryUpiId: string;
  accountHolderName: string;
  bankName?: string;
  merchantName: string;
  merchantCode?: string;
  defaultCurrency: string;
  qrDisplaySize: number;
  enableUpiPayments: boolean;
  defaultUpiNoteFormat: string;
  secondaryUpiIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationItem {
  id: string;
  ownerUid: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  link?: string; // Route path or external link to navigate when clicked
  isRead: boolean;
  createdAt: Date;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  businessId: string;
  customerId: string;
  invoiceId: string;
  paymentId: string;
  userId: string;
  receiptDate: Date;
  status: 'paid' | 'partially_paid' | 'advance' | 'refunded' | 'cancelled' | 'void';
  amountPaid: number;
  currency: string;
  businessDetails: {
    name: string;
    logoUrl?: string;
    gstin?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    email: string;
    phone: string;
    website?: string;
  };
  customerDetails: {
    name: string;
    companyName?: string;
    gstin?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    phone?: string;
    email?: string;
  };
  paymentDetails: {
    invoiceNumber: string;
    invoiceDate?: Date;
    invoiceDueDate?: Date;
    paymentDate: Date;
    paymentMethod: string;
    transactionId?: string;
    referenceNumber?: string;
    collectedBy?: string;
    upi?: {
      upiId: string;
      upiApp?: string;
      transactionId: string;
    };
    bankTransfer?: {
      bankName: string;
      utrNumber: string;
    };
    card?: {
      cardBrand: string;
      last4: string;
      authCode?: string;
    };
    cash?: {
      receivedBy: string;
    };
    cheque?: {
      chequeNumber: string;
      bankName: string;
      clearanceStatus: 'pending' | 'cleared' | 'bounced';
    };
  };
  summary: {
    invoiceTotal: number;
    previousBalance: number;
    amountPaid: number;
    remainingBalance: number;
  };
  notes?: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptLog {
  id: string;
  receiptId: string;
  businessId: string;
  action: 'generated' | 'pdf_downloaded' | 'printed' | 'shared' | 'emailed' | 'regenerated';
  userId?: string;
  performedBy: string;
  device?: string;
  timestamp: Date;
}

export interface ReceiptEmailLog {
  id: string;
  receiptId: string;
  businessId: string;
  recipientEmail: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  timestamp: Date;
}

export type ReminderStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'delivered' | 'failed' | 'cancelled' | 'completed';

export type ReminderType = 'upcoming' | 'due_today' | 'first_overdue' | 'second_overdue' | 'final' | 'custom';

export type DeliveryChannel = 'email' | 'whatsapp' | 'sms' | 'in_app';

export interface ReminderSettings {
  id: string; // usually businessId
  businessId: string;
  ownerUid: string;
  enableAutomaticReminders: boolean;
  reminderFrequency: 'daily' | 'weekly' | 'custom';
  workingDaysOnly: boolean;
  businessHoursOnly: boolean;
  maxAttempts: number;
  defaultEmailTemplateId: string;
  defaultSenderName: string;
  defaultReplyToEmail: string;
  enabledReminderTypes: Record<ReminderType, boolean>;
  schedules: {
    upcoming_7_days: boolean;
    upcoming_3_days: boolean;
    upcoming_1_day: boolean;
    due_today: boolean;
    overdue_3_days: boolean;
    overdue_7_days: boolean;
    overdue_15_days: boolean;
    monthly_until_paid: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderTemplate {
  id: string;
  businessId: string;
  ownerUid: string;
  name: string;
  type: ReminderType | 'thank_you' | 'refund';
  subject: string;
  content: string; // rich text or markdown/plain
  isDefault: boolean;
  signature?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentReminder {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  userId: string; // owner uid
  reminderType: ReminderType;
  deliveryChannel: DeliveryChannel;
  status: ReminderStatus;
  amount: number;
  outstandingAmount: number;
  dueDate: Date;
  lastSentAt?: Date;
  nextScheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderLog {
  id: string;
  businessId: string;
  reminderId: string;
  invoiceId: string;
  customerId: string;
  userId: string;
  action: 'created' | 'scheduled' | 'sending' | 'sent' | 'delivered' | 'failed' | 'cancelled' | 'opened' | 'payment_received';
  channel: DeliveryChannel | 'system';
  description: string;
  recipient: string; // email, phone, etc.
  performedBy: 'system' | 'business' | 'customer';
  errorMessage?: string;
  timestamp: Date;
}

export interface ScheduledReminder {
  id: string;
  businessId: string;
  ownerUid: string;
  invoiceId: string;
  customerId: string;
  reminderType: ReminderType;
  channel: DeliveryChannel;
  scheduledDate: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderDeliveryLog {
  id: string;
  businessId: string;
  reminderId: string;
  channel: DeliveryChannel;
  recipient: string;
  status: 'sent' | 'delivered' | 'failed';
  errorMessage?: string;
  sentAt: Date;
}


