import { useState, useEffect } from "react";
import { supabase } from "../../supabase/config";
import { useAuth } from "../../context/AuthContext";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { 
  Link2, 
  Copy, 
  Check, 
  ExternalLink, 
  ToggleLeft, 
  ToggleRight, 
  Clock, 
  RefreshCw 
} from "lucide-react";

interface ShareInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

export function ShareInvoiceDialog({ isOpen, onClose, invoice }: ShareInvoiceDialogProps) {
  const toast = useToast();
  const { activeBusiness } = useAuth();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [token, setToken] = useState("");
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !invoice?.id) return;

    const fetchShareSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('sales_documents')
          .select('share_token')
          .eq('id', invoice.id)
          .single();

        if (error) {
          console.error("Error fetching share token:", error);
        } else if (data?.share_token) {
          setIsEnabled(true);
          setToken(data.share_token);
        } else {
          setIsEnabled(false);
          setToken("");
        }
      } catch (err) {
        console.error("Error loading share settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchShareSettings();
  }, [isOpen, invoice?.id]);

  const handleToggleShare = async () => {
    if (!invoice?.id) return;
    try {
      if (isEnabled) {
        // Disable token
        await supabase
          .from('sales_documents')
          .update({ share_token: null })
          .eq('id', invoice.id);

        setIsEnabled(false);
        setToken("");
        toast.success("Sharing Disabled", "Public access to this invoice has been revoked.");
      } else {
        // Enable token (generate crypto UUID)
        const newToken = crypto.randomUUID();
        await supabase
          .from('sales_documents')
          .update({ share_token: newToken })
          .eq('id', invoice.id);

        setIsEnabled(true);
        setToken(newToken);
        toast.success("Sharing Activated", "Public share link generated successfully.");
      }
    } catch (err) {
      console.error("Error toggling share state:", err);
      toast.error("Error", "Could not update sharing state.");
    }
  };

  const handleRegenerateToken = async () => {
    if (!invoice?.id) return;
    try {
      const newToken = crypto.randomUUID();
      await supabase
        .from('sales_documents')
        .update({ share_token: newToken })
        .eq('id', invoice.id);

      setToken(newToken);
      setIsEnabled(true);
      toast.success("Link Regenerated", "New secure link created. Previous link revoked.");
    } catch (err) {
      console.error("Error regenerating token:", err);
      toast.error("Error", "Could not regenerate link.");
    }
  };

  const getShareUrl = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}#/public-invoice?id=${invoice?.id}&token=${token}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    toast.success("Copied", "Public invoice link copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Public Web Share & Access" size="md">
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-3">
            <Link2 className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Public Access Link</h4>
              <p className="text-xs text-slate-500">
                Generate secure, token-scoped public links. Your customer can view and pay without an account.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Activate Link Sharing</p>
              <p className="text-xs text-slate-500">Enable this invoice to be accessible via unique token link</p>
            </div>
            <button
              onClick={handleToggleShare}
              className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              {isEnabled ? (
                <ToggleRight className="w-12 h-12 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-12 h-12 text-slate-400" />
              )}
            </button>
          </div>

          {isEnabled && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase block">Shareable Invoice Link</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 select-all truncate flex items-center">
                    {getShareUrl()}
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="flex-shrink-0 h-10 px-3 flex items-center justify-center border-slate-200 hover:border-slate-300"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => window.open(getShareUrl(), "_blank")}
                    className="flex-shrink-0 h-10 px-3 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700"
                  >
                    <ExternalLink className="w-4 h-4 text-white" />
                  </Button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleRegenerateToken}
                  className="text-xs text-slate-600 dark:text-slate-300 py-1.5 px-3"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Regenerate Secure Token
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
