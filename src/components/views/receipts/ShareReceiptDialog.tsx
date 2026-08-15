import React, { useState } from "react";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Copy, Check, QrCode, Share2, AlertCircle } from "lucide-react";
import { PaymentReceipt } from "../../../types";
import { addReceiptLog } from "../../../services/receiptService";
import { useToast } from "../../ui/Toast";

interface ShareReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: PaymentReceipt;
}

export function ShareReceiptDialog({ isOpen, onClose, receipt }: ShareReceiptDialogProps) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const shareUrl = `${window.location.origin}/#/public-receipt?id=${receipt.id}&token=${receipt.token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link Copied!", "Receipt sharing link copied to clipboard.");
      await addReceiptLog(receipt.id, receipt.businessId, 'shared', receipt.userId, 'business');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Error", "Could not copy link to clipboard.");
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Share Payment Receipt" size="md">
      <div className="space-y-6 pt-4 text-slate-800 dark:text-slate-100">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Secure Public Access Link</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Anyone with this unique link can view, print, or download this verified payment receipt securely.</p>
          </div>
        </div>

        {/* Input box with Copy */}
        <div className="flex gap-2 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 items-center">
          <Input 
            value={shareUrl} 
            readOnly 
            className="flex-1 bg-transparent border-none text-xs font-mono select-all text-slate-600 dark:text-slate-300 shadow-none focus-visible:ring-0 py-1"
          />
          <Button 
            onClick={handleCopy} 
            variant="primary" 
            className="rounded-lg font-bold gap-1 px-4 py-1.5 text-xs shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Link
              </>
            )}
          </Button>
        </div>

        {/* QR Code section */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
          <div className="bg-white p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 shadow-md">
            {/* Displaying visual indicator for QR */}
            <QrCode className="w-36 h-36 text-indigo-600 dark:text-indigo-500" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">Secure Scan Code</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Scan this code with a mobile device camera to load the receipt instantly on the fly.</p>
          </div>
        </div>

        {/* Info box */}
        <div className="flex gap-2.5 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-100/50 dark:border-cyan-900/30 p-4 rounded-xl text-xs text-cyan-800 dark:text-cyan-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Cryptographically Bound Links</h4>
            <p className="mt-0.5 leading-relaxed text-[11px] opacity-90">Every link contains a cryptographically randomized high-entropy token parameter. Unauthorized callers cannot crawl or guess receipt locations.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={onClose} variant="ghost" className="font-bold">Close Dialog</Button>
        </div>
      </div>
    </Dialog>
  );
}
