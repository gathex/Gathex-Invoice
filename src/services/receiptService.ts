import { supabase } from "../supabase/config";
import { Payment, PaymentReceipt, BusinessDetails, Customer, Invoice, ReceiptLog, ReceiptEmailLog } from "../types";

export function mapReceiptRow(row: any): PaymentReceipt {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    businessId: row.business_id,
    customerId: row.customer_id,
    invoiceId: row.invoice_id,
    paymentId: row.payment_id,
    userId: row.user_id,
    receiptDate: row.receipt_date ? new Date(row.receipt_date) : new Date(),
    status: row.status || 'paid',
    amountPaid: Number(row.amount_paid || 0),
    currency: row.currency || 'INR',
    businessDetails: row.business_details || {},
    customerDetails: row.customer_details || {},
    paymentDetails: row.payment_details || {},
    summary: row.summary || {},
    notes: row.notes || undefined,
    token: row.share_token,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
  };
}

export async function generateNextReceiptNumber(businessId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  try {
    const { data, error } = await supabase
      .from('payment_receipts')
      .select('receipt_number')
      .eq('business_id', businessId)
      .order('receipt_number', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      const latestNumber = data[0].receipt_number; // e.g. "RCT-2026-000005"
      const parts = latestNumber.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[1], 10);
        const sequence = parseInt(parts[2], 10);
        
        if (year === currentYear) {
          const nextSeq = String(sequence + 1).padStart(6, "0");
          return `RCT-${currentYear}-${nextSeq}`;
        }
      }
    }
  } catch (error) {
    console.error("Error generating receipt number, defaulting:", error);
  }

  return `RCT-${currentYear}-000001`;
}

export async function addReceiptLog(
  receiptId: string,
  businessId: string,
  action: ReceiptLog['action'],
  userId?: string,
  performedBy: string = 'business'
) {
  try {
    const logDoc = {
      receipt_id: receiptId,
      business_id: businessId,
      action,
      user_id: userId || null,
      performed_by: performedBy,
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server'
    };
    await supabase.from('receipt_logs').insert(logDoc);
  } catch (error) {
    console.error("Error creating receipt audit log:", error);
  }
}

export async function logReceiptDownload(receiptId: string, businessId: string, performedBy: string = 'business') {
  try {
    await addReceiptLog(receiptId, businessId, 'pdf_downloaded', undefined, performedBy);
  } catch (error) {
    console.error("Error logging receipt download:", error);
  }
}

export async function logReceiptEmail(receiptId: string, businessId: string, email: string, status: 'sent' | 'failed', error?: string) {
  try {
    const logDoc = {
      receipt_id: receiptId,
      business_id: businessId,
      recipient_email: email,
      status,
      error_message: error || null
    };
    await supabase.from('receipt_email_history').insert(logDoc);
    await addReceiptLog(receiptId, businessId, 'emailed', undefined, 'business');
  } catch (error) {
    console.error("Error logging receipt email:", error);
  }
}

export async function createReceiptFromPayment(
  payment: Payment,
  business: BusinessDetails,
  invoice: Invoice,
  customer?: Customer
): Promise<PaymentReceipt> {
  const nextReceiptNo = await generateNextReceiptNumber(payment.businessId);

  // Calculate balances
  const previousBalance = (invoice.amountDue || 0) + payment.amount;
  const remainingBalance = invoice.amountDue || 0;

  // Map payment status to receipt status
  let receiptStatus: PaymentReceipt['status'] = 'paid';
  if (payment.status === 'cancelled') {
    receiptStatus = 'cancelled';
  } else if (payment.status === 'refunded') {
    receiptStatus = 'refunded';
  } else if (payment.status === 'partially_paid') {
    receiptStatus = 'partially_paid';
  } else if (payment.paymentType === 'advance') {
    receiptStatus = 'advance';
  }

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

  const paymentDetailsObj: any = {
    invoiceNumber: payment.invoiceNumber,
    invoiceDate: invoice.issueDate ? new Date(invoice.issueDate) : undefined,
    invoiceDueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
    paymentDate: payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate),
    paymentMethod: payment.paymentMethod,
    transactionId: payment.transactionId || undefined,
    referenceNumber: payment.referenceNumber || undefined,
    collectedBy: payment.recordedBy || undefined,
  };

  const method = payment.paymentMethod.toLowerCase();
  if (method === 'upi') {
    paymentDetailsObj.upi = {
      upiId: business.upiId || "",
      transactionId: payment.transactionId || ""
    };
  } else if (method === 'bank_transfer') {
    paymentDetailsObj.bankTransfer = {
      bankName: business.bankDetails?.bankName || "",
      utrNumber: payment.transactionId || payment.referenceNumber || ""
    };
  } else if (method === 'credit_card' || method === 'debit_card') {
    paymentDetailsObj.card = {
      cardBrand: "Card",
      last4: payment.referenceNumber || "xxxx"
    };
  } else if (method === 'cash') {
    paymentDetailsObj.cash = {
      receivedBy: business.name
    };
  } else if (method === 'cheque') {
    paymentDetailsObj.cheque = {
      chequeNumber: payment.referenceNumber || "",
      bankName: business.bankDetails?.bankName || "",
      clearanceStatus: 'pending'
    };
  }

  const receiptRow = {
    id: payment.id,
    receipt_number: nextReceiptNo,
    business_id: payment.businessId,
    customer_id: payment.customerId || null,
    invoice_id: payment.invoiceId,
    payment_id: payment.id,
    user_id: payment.ownerUid,
    receipt_date: (payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate)).toISOString().split('T')[0],
    status: receiptStatus,
    amount_paid: payment.amount,
    currency: payment.currency || "INR",
    business_details: {
      name: business.name,
      logoUrl: business.logoUrl || undefined,
      gstin: business.gstin || undefined,
      address: cleanAddress(business.address),
      email: business.email,
      phone: business.phone,
      website: business.website || undefined
    },
    customer_details: {
      name: customer?.name || payment.customerName,
      companyName: customer?.companyName || invoice.customerDetails?.companyName || undefined,
      gstin: customer?.gstin || invoice.customerDetails?.gstin || undefined,
      address: cleanAddress((customer as any)?.billingAddress || invoice.customerDetails?.address),
      phone: customer?.phone || invoice.customerDetails?.phone || undefined,
      email: customer?.email || invoice.customerDetails?.email || undefined
    },
    payment_details: paymentDetailsObj,
    summary: {
      invoiceTotal: invoice.grandTotal || 0,
      previousBalance,
      amountPaid: payment.amount,
      remainingBalance
    },
    notes: payment.notes || null
  };

  const { data, error } = await supabase
    .from('payment_receipts')
    .upsert(receiptRow)
    .select('*')
    .single();

  if (error) {
    console.error("Error creating receipt:", error);
    throw error;
  }

  await addReceiptLog(data.id, data.business_id, 'generated', payment.ownerUid, 'system');
  return mapReceiptRow(data);
}
