import { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = 
  | "default" 
  | "primary" 
  | "accent" 
  | "success" 
  | "warning" 
  | "danger" 
  | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "", ...props }: BadgeProps) {
  const baseStyle = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border";
  
  const variants = {
    default: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60",
    primary: "bg-primary-50 text-primary-700 border-primary-200/50 dark:bg-primary-950/40 dark:text-primary-300 dark:border-primary-800/40",
    accent: "bg-accent-50 text-accent-700 border-accent-200/50 dark:bg-accent-950/40 dark:text-accent-300 dark:border-accent-800/40",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
    warning: "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
    danger: "bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
    neutral: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/40"
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
