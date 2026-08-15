import React from "react";
import { PaymentReceipt } from "../../../types";
import { CheckCircle2, ShieldCheck, CreditCard, Banknote, Landmark, QrCode } from "lucide-react";
import { Badge } from "../../ui/Badge";

interface ReceiptDocumentProps {
  receipt: PaymentReceipt;
}

export function ReceiptDocument({ receipt }: ReceiptDocumentProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: receipt.currency || 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const getStatusBadge = (status: PaymentReceipt['status']) => {
    switch (status) {
      case "paid":
        return <Badge variant="primary" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider px-3 py-1">PAID</Badge>;
      case "partially_paid":
        return <Badge variant="warning" className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold uppercase tracking-wider px-3 py-1">PARTIAL</Badge>;
      case "advance":
        return <Badge variant="default" className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-xs font-bold uppercase tracking-wider px-3 py-1">ADVANCE</Badge>;
      case "refunded":
        return <Badge variant="danger" className="bg-red-500/10 text-red-600 border border-red-500/20 text-xs font-bold uppercase tracking-wider px-3 py-1">REFUNDED</Badge>;
      case "cancelled":
        return <Badge variant="danger" className="bg-slate-500/10 text-slate-600 border border-slate-500/20 text-xs font-bold uppercase tracking-wider px-3 py-1">CANCELLED</Badge>;
      case "void":
        return <Badge variant="danger" className="bg-stone-500/10 text-stone-600 border border-stone-500/20 text-xs font-bold uppercase tracking-wider px-3 py-1">VOID</Badge>;
      default:
        return <Badge variant="default" className="text-xs uppercase px-3 py-1">{status}</Badge>;
    }
  };

  const business = receipt.businessDetails;
  const customer = receipt.customerDetails;
  const payment = receipt.paymentDetails;
  const summary = receipt.summary;

  return (
    <div className="bg-white text-slate-800 p-6 md:p-10 font-sans border border-slate-100 rounded-2xl shadow-xl max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
      {/* 1. Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 pb-8 items-start">
        {/* Business details */}
        <div className="space-y-3">
          {business.logoUrl ? (
            <img src={business.logoUrl} alt="Logo" className="max-h-16 w-auto object-contain roundedReferrer" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-600/20">
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{business.name}</h1>
            {business.gstin && (
              <p className="text-xs font-semibold text-indigo-600 mt-1">GSTIN: <span className="font-mono">{business.gstin}</span></p>
            )}
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            {business.address && (
              <p>{business.address.street}, {business.address.city}, {business.address.state} - {business.address.postalCode}</p>
            )}
            <p>Email: {business.email} {business.phone && `| Phone: ${business.phone}`}</p>
            {business.website && <p>Web: {business.website}</p>}
          </div>
        </div>

        {/* Receipt Title/Meta */}
        <div className="md:text-right space-y-3 flex flex-col md:items-end">
          <div className="text-sm font-bold tracking-widest text-slate-400 uppercase">Payment Receipt</div>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{receipt.receiptNumber}</div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 md:text-right mt-1">
            <span>Date:</span>
            <span className="font-semibold text-slate-800">{new Date(receipt.receiptDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
            <span>Status:</span>
            <div className="md:ml-auto">{getStatusBadge(receipt.status)}</div>
          </div>
        </div>
      </div>

      {/* 2. Customer & Payment Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-slate-100">
        {/* Customer Information */}
        <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Customer Details</h3>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-base">{customer.name}</h4>
            {customer.companyName && <p className="text-xs text-slate-600 font-medium">{customer.companyName}</p>}
            {customer.gstin && (
              <p className="text-xs font-mono font-bold text-indigo-600">GSTIN: {customer.gstin}</p>
            )}
          </div>
          <div className="text-xs text-slate-500 space-y-0.5">
            {customer.address && (
              <p>{customer.address.street}, {customer.address.city}, {customer.address.state} - {customer.address.postalCode}</p>
            )}
            {customer.phone && <p>Phone: {customer.phone}</p>}
            {customer.email && <p>Email: {customer.email}</p>}
          </div>
        </div>

        {/* Payment Transaction Info */}
        <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Transaction Info</h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
            <span className="text-slate-500">Invoice Reference:</span>
            <span className="font-bold text-slate-900 font-mono">{payment.invoiceNumber}</span>

            {payment.invoiceDate && (
              <>
                <span className="text-slate-500">Invoice Date:</span>
                <span className="text-slate-800">{new Date(payment.invoiceDate).toLocaleDateString('en-IN')}</span>
              </>
            )}

            <span className="text-slate-500">Payment Date:</span>
            <span className="font-semibold text-slate-800">{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</span>

            <span className="text-slate-500">Payment Method:</span>
            <span className="font-bold text-indigo-600 uppercase tracking-wide">{payment.paymentMethod.replace('_', ' ')}</span>

            {(payment.transactionId || payment.referenceNumber) && (
              <>
                <span className="text-slate-500">Transaction/UTR ID:</span>
                <span className="font-mono text-slate-800 break-all">{payment.transactionId || payment.referenceNumber}</span>
              </>
            )}

            {payment.collectedBy && (
              <>
                <span className="text-slate-500">Recorded By:</span>
                <span className="text-slate-700">Staff Secure node</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Dynamic Payment Method Card */}
      {(payment.upi || payment.bankTransfer || payment.card || payment.cash || payment.cheque) && (
        <div className="py-6 border-b border-slate-100">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Verification Details</h3>
          <div className="bg-indigo-50/20 border border-indigo-100/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* UPI Details */}
            {payment.upi && (
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-600">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">UPI Settlement Channel</div>
                  <div className="text-xs font-semibold text-slate-800">VPA: <span className="font-mono text-indigo-600">{payment.upi.upiId}</span></div>
                  {payment.upi.transactionId && <div className="text-[10px] font-mono text-slate-400">TXID: {payment.upi.transactionId}</div>}
                </div>
              </div>
            )}

            {/* Bank Transfer Details */}
            {payment.bankTransfer && (
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-600">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Bank Wire Settlement</div>
                  <div className="text-xs font-semibold text-slate-800">Bank Name: {payment.bankTransfer.bankName}</div>
                  <div className="text-[10px] font-mono text-slate-400">UTR: {payment.bankTransfer.utrNumber}</div>
                </div>
              </div>
            )}

            {/* Card Details */}
            {payment.card && (
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Card Authorization</div>
                  <div className="text-xs font-semibold text-slate-800">Brand: {payment.card.cardBrand || "Credit Card"}</div>
                  <div className="text-[10px] font-mono text-slate-400">Card ending: **** **** **** {payment.card.last4}</div>
                </div>
              </div>
            )}

            {/* Cash Details */}
            {payment.cash && (
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-600">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cash Register</div>
                  <div className="text-xs font-semibold text-slate-800">Received By: {payment.cash.receivedBy}</div>
                </div>
              </div>
            )}

            {/* Cheque Details */}
            {payment.cheque && (
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-600">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cheque Clearance</div>
                  <div className="text-xs font-semibold text-slate-800">Cheque No: <span className="font-mono">{payment.cheque.chequeNumber}</span> | Bank: {payment.cheque.bankName}</div>
                  <div className="text-[10px] uppercase font-bold mt-1 text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded w-max">Status: {payment.cheque.clearanceStatus}</div>
                </div>
              </div>
            )}

            {/* Stamp / Verification Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-[10px] font-bold font-mono ml-auto">
              <ShieldCheck className="w-3.5 h-3.5" /> SECURE LEDGER
            </div>
          </div>
        </div>
      )}

      {/* 4. Payment Financial Summary */}
      <div className="py-8 border-b border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4">Financial Summary</h3>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100/50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 text-left">Description</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-4 text-slate-600">Total Invoice Valuation</td>
                <td className="p-4 text-right font-semibold text-slate-900">{formatCurrency(summary.invoiceTotal)}</td>
              </tr>
              <tr>
                <td className="p-4 text-slate-600">Previous Account Outstanding Balance</td>
                <td className="p-4 text-right font-semibold text-slate-900">{formatCurrency(summary.previousBalance)}</td>
              </tr>
              <tr className="bg-emerald-500/[0.02]">
                <td className="p-4 font-bold text-emerald-800">Amount Paid in this Settlement</td>
                <td className="p-4 text-right font-black text-emerald-600 text-lg">{formatCurrency(receipt.amountPaid)}</td>
              </tr>
              <tr className="bg-slate-100/30">
                <td className="p-4 font-bold text-slate-700">Remaining Valuation Due</td>
                <td className="p-4 text-right font-black text-slate-950 text-base">{formatCurrency(summary.remainingBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Notes Section if any */}
      {receipt.notes && (
        <div className="py-6 border-b border-slate-100">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Payment Notes</h3>
          <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/20 border border-amber-100/30 p-3 rounded-xl">{receipt.notes}</p>
        </div>
      )}

      {/* 6. Signatures Grid */}
      <div className="pt-10 pb-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
        {/* Left Side: Verification QR & Digital Stamp */}
        <div className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-2xl shadow-inner">
            <div className="w-16 h-16 bg-white border border-slate-200/60 rounded-xl flex items-center justify-center p-1">
              {/* Fallback to QR code indicator */}
              <QrCode className="w-full h-full text-slate-400 opacity-80" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Digitally Signed</span>
              <p className="text-[10px] font-black text-slate-800 mt-1 uppercase tracking-wide">SECURE HASH CODE</p>
              <p className="text-[8px] font-mono text-slate-400">{receipt.token.substring(0, 16)}...</p>
            </div>
          </div>
        </div>

        {/* Right Side: Signatures */}
        <div className="grid grid-cols-2 gap-4 text-center text-xs">
          {/* Customer Signature placeholder */}
          <div className="space-y-2 flex flex-col items-center">
            <div className="w-32 border-b border-dashed border-slate-300 h-10"></div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Customer Sign</span>
          </div>

          {/* Business signature */}
          <div className="space-y-2 flex flex-col items-center">
            <div className="w-32 border-b border-slate-300 h-10 flex items-end justify-center">
              <span className="text-[10px] font-mono italic text-indigo-500 select-none pb-1">{business.name.substring(0, 15)}</span>
            </div>
            <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">Authorized Sign</span>
          </div>
        </div>
      </div>

      {/* 7. Footer */}
      <div className="pt-8 border-t border-slate-100 text-center space-y-2 text-[10px] text-slate-400 uppercase tracking-widest">
        <p className="font-bold text-indigo-600/80">Thank you for your payment.</p>
        <p className="text-[9px]">If you have any questions, contact us at <span className="font-semibold text-slate-600">{business.email}</span></p>
        <p className="text-[8px] tracking-normal font-mono normal-case text-slate-300 mt-4">Powered by GATHEX Invoice Ledger Engine v5.5</p>
      </div>
    </div>
  );
}
