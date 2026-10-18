/**
 * GATHEX - Indian GST & GSTR-1 Compliant Spreadsheet Generator
 * High-fidelity, real-time client-side CSV downloads
 */

import { Invoice } from "../types";

// Helper to escape CSV strings properly
function escapeCSVCell(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // If the cell contains double quotes, commas, or newlines, we wrap it in quotes and double-quote the inner quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Downloads a standard GSTR-1 compliant Outward B2B Supplies spreadsheet (CSV format)
 */
export function downloadGSTR1CSV(invoices: any[], businessGstin: string) {
  // GSTR-1 Standard B2B Schema Headers
  const headers = [
    "GSTIN of Recipient",
    "Receiver Name",
    "Invoice Number",
    "Invoice Date",
    "Invoice Value",
    "Place Of Supply",
    "Reverse Charge",
    "Applicable % of Tax Rate",
    "Invoice Type",
    "E-Commerce GSTIN",
    "Rate (%)",
    "Taxable Value (INR)",
    "CGST (INR)",
    "SGST (INR)",
    "IGST (INR)",
    "Cess (INR)",
    "Grand Total (INR)",
    "Status"
  ];

  const rows = [headers];

  invoices.forEach((inv) => {
    // Determine the math for this invoice
    // Invoices could have items with different GST rates, so we can group them or list the summary
    const math = calculateInvoiceMathLocal(inv, businessGstin);
    
    // Check if reverse charge is applicable (default: N)
    const reverseCharge = "N";
    
    // Determine the general/highest rate of GST in the items, or overall
    const rate = inv.items && inv.items.length > 0 ? inv.items[0].gstRate : 18;
    
    // Extract state code
    const stateName = inv.customerState || inv.placeOfSupply || "Maharashtra";

    const row = [
      inv.customerGstin || "URP (Unregistered)",
      inv.customerName || "",
      inv.invoiceNumber || "",
      inv.date || "",
      math.grandTotal.toFixed(2),
      stateName,
      reverseCharge,
      "0", // Applicable % of tax rate (0 for full rate)
      inv.customerGstin ? "Regular B2B" : "B2C Others",
      "", // E-comm GSTIN
      rate.toString(),
      math.totalTaxableAmount.toFixed(2),
      math.totalCgst.toFixed(2),
      math.totalSgst.toFixed(2),
      math.totalIgst.toFixed(2),
      "0.00", // Cess
      math.grandTotal.toFixed(2),
      (inv.status || "Draft").toUpperCase()
    ];

    rows.push(row.map(escapeCSVCell));
  });

  // Convert to CSV string with standard carriage returns
  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  
  // Create download element
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const formattedDate = new Date().toISOString().split('T')[0];
  link.setAttribute("download", `GSTR1_Outward_Supplies_${formattedDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a general Invoice Ledger sheet
 */
export function downloadLedgerCSV(invoices: any[], businessName: string, businessGstin: string = "") {
  const headers = [
    "Invoice Number",
    "Customer Name",
    "Customer GSTIN",
    "Issue Date",
    "Due Date",
    "Status",
    "Sub Total (INR)",
    "Discount (INR)",
    "Taxable Amount (INR)",
    "CGST (INR)",
    "SGST (INR)",
    "IGST (INR)",
    "Grand Total (INR)",
    "Notes"
  ];

  const rows = [headers];

  invoices.forEach((inv) => {
    // Recalculate local math
    const math = calculateInvoiceMathLocal(inv, businessGstin);

    const row = [
      inv.invoiceNumber || "",
      inv.customerName || "",
      inv.customerGstin || "Unregistered",
      inv.date || "",
      inv.dueDate || "",
      (inv.status || "Draft").toUpperCase(),
      math.subTotal.toFixed(2),
      math.totalDiscount.toFixed(2),
      math.totalTaxableAmount.toFixed(2),
      math.totalCgst.toFixed(2),
      math.totalSgst.toFixed(2),
      math.totalIgst.toFixed(2),
      math.grandTotal.toFixed(2),
      inv.notes || ""
    ];

    rows.push(row.map(escapeCSVCell));
  });

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Invoice_Ledger_${businessName.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Local helper to recalculate math for any invoice without depending on state
function calculateInvoiceMathLocal(inv: any, businessGstin: string = "") {
  let subTotal = 0;
  let totalDiscount = Number(inv.discountGlobal) || 0;
  let totalTaxableAmount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const bizGstin = businessGstin || "";
  const bizStateCode = bizGstin.length >= 2 ? bizGstin.substring(0, 2) : "";
  
  const placeOfSupply = inv.placeOfSupply || "";
  const supplyStateMatch = placeOfSupply.match(/\((\d{2})\)/);
  const supplyStateCode = supplyStateMatch ? supplyStateMatch[1] : "";
  const isIntrastate = bizStateCode && supplyStateCode ? bizStateCode === supplyStateCode : false;

  const items = inv.items || [];
  items.forEach((item: any) => {
    const baseSub = (Number(item.price) || 0) * (Number(item.quantity) || 0);
    const rowTaxable = Math.max(0, baseSub - (Number(item.discountAmount) || 0));
    
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const gstRate = Number(item.gstRate) || 0;

    if (isIntrastate) {
      cgst = rowTaxable * (gstRate / 2) / 100;
      sgst = rowTaxable * (gstRate / 2) / 100;
    } else {
      igst = rowTaxable * gstRate / 100;
    }

    subTotal += baseSub;
    totalDiscount += Number(item.discountAmount) || 0;
    totalTaxableAmount += rowTaxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;
  });

  const tentativeTotal = totalTaxableAmount + totalCgst + totalSgst + totalIgst - Number(inv.discountGlobal || 0);
  const grandTotal = Math.round(tentativeTotal);

  return {
    subTotal,
    totalDiscount,
    totalTaxableAmount,
    totalCgst,
    totalSgst,
    totalIgst,
    grandTotal
  };
}
