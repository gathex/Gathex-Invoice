import React from "react";
import logoImg from "../../assets/logo.png";

interface LogoProps {
  className?: string;
  size?: number;
  variant?: "icon" | "full";
  showText?: boolean;
}

export function GathexLogo({ className = "w-9 h-9", size, variant = "icon", showText = false }: LogoProps) {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  const LogoIcon = (
    <img
      src={logoImg}
      alt="Gathex Logo"
      className={`object-contain rounded-xl select-none ${className}`}
      style={style}
    />
  );

  if (variant === "full" || showText) {
    return (
      <div className="flex items-center gap-3">
        {LogoIcon}
        <div>
          <span className="text-lg font-extrabold font-display tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            GATHEX
          </span>
          <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500 dark:text-indigo-400 block -mt-1 font-display">
            Invoice
          </span>
        </div>
      </div>
    );
  }

  return LogoIcon;
}
