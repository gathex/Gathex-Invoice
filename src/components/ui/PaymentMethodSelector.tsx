import React from "react";
import { CreditCard, Landmark, Wallet, Smartphone, Banknote } from "lucide-react";

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (method: string) => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  const methods = [
    { id: "upi", label: "UPI / App", icon: Smartphone },
    { id: "bank_transfer", label: "Bank Transfer", icon: Landmark },
    { id: "credit_card", label: "Card", icon: CreditCard },
    { id: "cash", label: "Cash", icon: Banknote },
    { id: "other", label: "Other", icon: Wallet }
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {methods.map((method) => {
        const Icon = method.icon;
        const isSelected = value === method.id;
        return (
          <button
            key={method.id}
            type="button"
            onClick={() => onChange(method.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
              isSelected 
                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
                : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent"
            }`}
          >
            <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
            <span className="text-[10px] font-bold text-center leading-tight">
              {method.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
