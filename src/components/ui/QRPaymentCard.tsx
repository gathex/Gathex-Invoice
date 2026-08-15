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

export function QRPaymentCard({ upiString, payeeName, upiId, size = 160 }: QRPaymentCardProps) {
  if (!upiString || !upiId) return null;

  return (
    <Card className="p-6 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-900/30">
      <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 p-3 rounded-full mb-4">
        <Smartphone className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
        Pay via UPI
      </h3>
      <p className="text-xs text-slate-500 mb-6">Scan with any supported UPI app</p>
      
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-4 inline-block">
        <QRCodeSVG 
          value={upiString} 
          size={size} 
          level="M" 
          includeMargin={false} 
        />
      </div>

      <div className="text-xs space-y-1">
        <p className="font-medium text-slate-700 dark:text-slate-300">{payeeName}</p>
        <p className="text-slate-500 font-mono">{upiId}</p>
      </div>
      
      <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full">
        <ShieldCheck className="w-3.5 h-3.5" />
        Secure Payment
      </div>
    </Card>
  );
}
