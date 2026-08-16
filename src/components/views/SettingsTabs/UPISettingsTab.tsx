import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { businessServiceUpi } from "../../../services/businessService";
import { BusinessDetails, UPIConfig } from "../../../types";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { useToast } from "../../ui/Toast";
import { QrCode, Save, Plus, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface UPISettingsTabProps {
  activeBusiness: BusinessDetails;
}

export function UPISettingsTab({ activeBusiness }: UPISettingsTabProps) {
  const { user } = useAuth();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [configId, setConfigId] = useState<string | undefined>(undefined);
  const [primaryUpiId, setPrimaryUpiId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [merchantCode, setMerchantCode] = useState("");
  const [enableUpiPayments, setEnableUpiPayments] = useState(true);
  const [defaultUpiNoteFormat, setDefaultUpiNoteFormat] = useState("INV-{invoiceNumber}");
  const [secondaryUpiIds, setSecondaryUpiIds] = useState<string[]>([]);
  const [newSecondaryUpi, setNewSecondaryUpi] = useState("");

  useEffect(() => {
    if (activeBusiness) {
      loadUpiConfig();
    }
  }, [activeBusiness]);

  const loadUpiConfig = async () => {
    setFetching(true);
    try {
      const conf = await businessServiceUpi.getUpiConfig(activeBusiness.id);
      if (conf) {
        setConfigId(conf.id);
        setPrimaryUpiId(conf.primaryUpiId || "");
        setAccountHolderName(conf.accountHolderName || "");
        setBankName(conf.bankName || "");
        setMerchantName(conf.merchantName || "");
        setMerchantCode(conf.merchantCode || "");
        setEnableUpiPayments(conf.enableUpiPayments ?? true);
        setDefaultUpiNoteFormat(conf.defaultUpiNoteFormat || "INV-{invoiceNumber}");
        setSecondaryUpiIds(conf.secondaryUpiIds || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const payload: Partial<UPIConfig> = {
        primaryUpiId,
        accountHolderName,
        bankName,
        merchantName,
        merchantCode,
        enableUpiPayments,
        defaultUpiNoteFormat,
        secondaryUpiIds,
        defaultCurrency: "INR",
        qrDisplaySize: 200,
      };
      
      const newId = await businessServiceUpi.updateUpiConfig(activeBusiness.id, user.uid, payload, configId);
      setConfigId(newId);
      toast.success("UPI Settings Saved", "Your UPI configuration has been updated successfully.");
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to save UPI settings.");
    } finally {
      setLoading(false);
    }
  };

  const addSecondaryUpi = () => {
    if (newSecondaryUpi.trim() && !secondaryUpiIds.includes(newSecondaryUpi.trim())) {
      setSecondaryUpiIds([...secondaryUpiIds, newSecondaryUpi.trim()]);
      setNewSecondaryUpi("");
    }
  };

  const removeSecondaryUpi = (upi: string) => {
    setSecondaryUpiIds(secondaryUpiIds.filter(id => id !== upi));
  };

  const makePrimary = (upi: string) => {
    const oldPrimary = primaryUpiId;
    setPrimaryUpiId(upi);
    const newSecondary = secondaryUpiIds.filter(id => id !== upi);
    if (oldPrimary) {
      newSecondary.push(oldPrimary);
    }
    setSecondaryUpiIds(newSecondary);
  };

  const upiQrString = `upi://pay?pa=${primaryUpiId}&pn=${encodeURIComponent(merchantName)}&cu=INR`;

  if (fetching) return <div className="p-8 text-center text-slate-500">Loading UPI configuration...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display">UPI Payment Configuration</h3>
        <p className="text-xs text-slate-400">Configure your BHIM UPI IDs to generate payment QR codes for invoices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Enable UPI Payments</p>
                <p className="text-xs text-slate-500">Show UPI QR codes on invoices and public payment links</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={enableUpiPayments} 
                  onChange={e => setEnableUpiPayments(e.target.checked)} 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Primary Identity</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Primary UPI ID *" value={primaryUpiId} onChange={e => setPrimaryUpiId(e.target.value)} required placeholder="merchant@upi" />
                <Input label="Merchant/Business Name *" value={merchantName} onChange={e => setMerchantName(e.target.value)} required placeholder="GATHEX TECH" />
                <Input label="Account Holder Name" value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} placeholder="John Doe" />
                <Input label="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="HDFC Bank" />
                <Input label="Merchant Code (MCC)" value={merchantCode} onChange={e => setMerchantCode(e.target.value)} placeholder="Optional (e.g. 0000)" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Secondary UPI IDs</h4>
              <div className="flex gap-2">
                <Input 
                  value={newSecondaryUpi} 
                  onChange={e => setNewSecondaryUpi(e.target.value)} 
                  placeholder="secondary@upi" 
                  onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addSecondaryUpi(); }}}
                />
                <Button type="button" variant="outline" onClick={addSecondaryUpi} className="shrink-0" icon={<Plus className="w-4 h-4" />}>Add</Button>
              </div>
              
              {secondaryUpiIds.length > 0 && (
                <ul className="space-y-2 mt-3">
                  {secondaryUpiIds.map(upi => (
                    <li key={upi} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{upi}</span>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" className="text-xs py-1 px-2 h-auto" onClick={() => makePrimary(upi)}>Set as Primary</Button>
                        <Button type="button" variant="ghost" className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-auto p-2" onClick={() => removeSecondaryUpi(upi)} icon={<Trash2 className="w-4 h-4" />} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="submit" variant="primary" loading={loading} icon={<Save className="w-4 h-4" />}>
                Save UPI Configuration
              </Button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary-600 mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">Static QR Preview</h4>
            <p className="text-xs text-slate-500 mb-6">Scan this code to test your basic UPI configuration.</p>
            
            {primaryUpiId && merchantName ? (
              <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200">
                <QRCodeSVG value={upiQrString} size={130} level="M" includeMargin={true} />
              </div>
            ) : (
              <div className="w-[160px] h-[160px] bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600">
                <p className="text-xs text-slate-400 px-4 text-center">Provide Primary UPI ID and Merchant Name to generate preview.</p>
              </div>
            )}
            
            {primaryUpiId && (
              <p className="mt-3 text-xs font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                {primaryUpiId}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
