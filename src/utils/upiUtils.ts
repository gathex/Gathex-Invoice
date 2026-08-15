import { Invoice, UPIConfig } from "../types";

export const generateDynamicUpiString = (invoice: Invoice, config: UPIConfig): string | null => {
  if (!config.enableUpiPayments || !config.primaryUpiId) {
    return null;
  }

  const { primaryUpiId, merchantName, merchantCode, defaultCurrency, defaultUpiNoteFormat } = config;
  
  // Format note
  let note = defaultUpiNoteFormat || "INV-{invoiceNumber}";
  note = note.replace("{invoiceNumber}", invoice.invoiceNumber);
  
  let upiString = `upi://pay?pa=${primaryUpiId}&pn=${encodeURIComponent(merchantName || "Merchant")}`;
  
  // Add amount if there is an amount due
  if (invoice.amountDue > 0) {
    upiString += `&am=${invoice.amountDue}`;
  }
  
  // Currency
  if (defaultCurrency) {
    upiString += `&cu=${defaultCurrency}`;
  } else {
    upiString += `&cu=INR`;
  }
  
  // Transaction note
  if (note) {
    upiString += `&tn=${encodeURIComponent(note)}`;
  }
  
  // Merchant Code
  if (merchantCode) {
    upiString += `&mc=${merchantCode}`;
  }

  // Invoice ID as a reference if needed, maybe tr
  // upiString += `&tr=${invoice.id}`;

  return upiString;
};
