import React from "react";
import { Card } from "./Card";
import { Smartphone, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface QRPaymentCardProps {
  upiString: string;
  payeeName: string;
  upiId: string;
  size?: number;
}

export function QRPaymentCard({ upiString, payeeName, upiId, size = 130 }: QRPaymentCardProps) {
  if (!upiString || !upiId) return null;

  return (
    <Card className="p-4 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-900/30">
      <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-full mb-2">
        <Smartphone className="w-5 h-5" />
      </div>
      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-0.5">
        Pay via UPI
      </h3>
      <p className="text-[11px] text-slate-500 mb-3">Scan with any supported UPI app</p>
      
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs mb-3 inline-block">
        <QRCodeSVG 
          value={upiString} 
          size={size} 
          level="M" 
          includeMargin={false} 
        />
      </div>

      <div className="text-xs space-y-0.5 text-center w-full px-2">
        <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">{payeeName}</p>
        <p className="text-slate-500 font-mono text-[11px] font-bold truncate">{upiId}</p>
      </div>
      
      <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 rounded-full">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>Secure Payment</span>
      </div>
    </Card>
  );
}
