import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabase/config";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Card } from "../../ui/Card";
import { useToast } from "../../ui/Toast";
import { PaymentMethodConfig } from "../../../types";
import { Check, Edit, Save, X, GripVertical } from "lucide-react";

import { Skeleton } from "../../ui/Skeleton";

export function PaymentMethodsTab({ activeBusiness }: { activeBusiness: any }) {
  const { user } = useAuth();
  const toast = useToast();
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for editing
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInternalNotes, setEditInternalNotes] = useState("");
  const [editIsEnabled, setEditIsEnabled] = useState(true);
  const [editIsDefault, setEditIsDefault] = useState(false);

  useEffect(() => {
    if (user && activeBusiness) {
      fetchMethods();
    }
  }, [user, activeBusiness]);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        await seedDefaultMethods();
      } else {
        const mapped = data.map(d => ({
          id: d.id,
          businessId: d.business_id,
          ownerUid: d.owner_uid,
          methodType: d.method_type,
          displayName: d.display_name,
          description: d.description,
          internalNotes: d.internal_notes,
          isEnabled: !!d.is_enabled,
          displayOrder: d.display_order,
          isDefault: !!d.is_default
        } as PaymentMethodConfig));
        setMethods(mapped);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch", "Could not load payment methods.");
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultMethods = async () => {
    if (!user || !activeBusiness) return;
    const defaults = [
      { method_type: "cash", display_name: "Cash", description: "Cash payments", is_enabled: true, is_default: false, display_order: 1 },
      { method_type: "upi", display_name: "UPI", description: "Google Pay, PhonePe, Paytm", is_enabled: true, is_default: true, display_order: 2 },
      { method_type: "bank_transfer", display_name: "Bank Transfer", description: "NEFT / RTGS / IMPS", is_enabled: true, is_default: false, display_order: 3 },
      { method_type: "credit_card", display_name: "Credit Card", description: "Visa, Mastercard", is_enabled: true, is_default: false, display_order: 4 },
      { method_type: "debit_card", display_name: "Debit Card", description: "Visa Debit, RuPay", is_enabled: true, is_default: false, display_order: 5 },
      { method_type: "cheque", display_name: "Cheque", description: "Physical Cheque", is_enabled: true, is_default: false, display_order: 6 },
      { method_type: "wallet", display_name: "Digital Wallet", description: "Paytm, Mobikwik", is_enabled: false, is_default: false, display_order: 7 },
      { method_type: "store_credit", display_name: "Store Credit", description: "Adjust against credit notes", is_enabled: false, is_default: false, display_order: 8 },
      { method_type: "offline", display_name: "Offline Payment", description: "Collected locally", is_enabled: false, is_default: false, display_order: 9 },
      { method_type: "mixed", display_name: "Mixed Payment", description: "Split across multiple methods", is_enabled: true, is_default: false, display_order: 10 }
    ].map(d => ({
      ...d,
      business_id: activeBusiness.id,
      owner_uid: user.uid
    }));

    await supabase.from('payment_methods').insert(defaults);
    await fetchMethods();
    toast.success("Defaults Loaded", "Standard payment methods configured.");
  };

  const startEdit = (m: PaymentMethodConfig) => {
    setEditingId(m.id);
    setEditDisplayName(m.displayName);
    setEditDescription(m.description || "");
    setEditInternalNotes(m.internalNotes || "");
    setEditIsEnabled(m.isEnabled);
    setEditIsDefault(m.isDefault);
  };

  const saveEdit = async (m: PaymentMethodConfig) => {
    try {
      if (editIsDefault) {
        await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('business_id', activeBusiness.id);
      }

      await supabase
        .from('payment_methods')
        .update({
          display_name: editDisplayName,
          description: editDescription,
          internal_notes: editInternalNotes,
          is_enabled: editIsEnabled,
          is_default: editIsDefault
        })
        .eq('id', m.id);

      toast.success("Method Updated", "Payment method configuration saved.");
      setEditingId(null);
      fetchMethods();
    } catch (err: any) {
      toast.error("Save Failed", err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80" />
        <div className="space-y-3 pt-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display">Payment Methods Management</h3>
        <p className="text-xs text-slate-400">Configure which modes of payment are accepted and customize display names for invoices and collections.</p>
      </div>

      <div className="space-y-4">
        {methods.map((m) => (
          <Card key={m.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {editingId === m.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Display Name" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
                  <Input label="Description (Optional)" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                </div>
                <Input label="Internal Notes" value={editInternalNotes} onChange={e => setEditInternalNotes(e.target.value)} />
                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editIsEnabled} onChange={e => setEditIsEnabled(e.target.checked)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Enabled</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editIsDefault} onChange={e => setEditIsDefault(e.target.checked)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Default Method</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="ghost" onClick={() => setEditingId(null)} icon={<X className="w-4 h-4" />}>Cancel</Button>
                  <Button variant="primary" onClick={() => saveEdit(m)} icon={<Save className="w-4 h-4" />}>Save Changes</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="cursor-move text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white capitalize">{m.displayName}</h4>
                      {m.isDefault && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 uppercase">Default</span>}
                      {!m.isEnabled && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">Disabled</span>}
                    </div>
                    {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                    <p className="text-[10px] text-slate-400 mt-1 uppercase">Type: {m.methodType.replace('_', ' ')}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => startEdit(m)} icon={<Edit className="w-3 h-3" />}>Edit</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
