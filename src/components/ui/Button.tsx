import React, { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { motion, HTMLMotionProps } from "framer-motion";

export type ButtonVariant = 
  | "primary" 
  | "secondary" 
  | "outline" 
  | "ghost" 
  | "danger"
  | "accent";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children?: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  spanStyle?: React.CSSProperties;
}

export function Button({ 
  children, 
  variant = "primary", 
  loading = false, 
  icon, 
  className = "", 
  disabled,
  type = "button",
  onClick,
  spanStyle,
  ...props 
}: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none font-sans";
  
  const variants = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/10 dark:bg-primary-500 dark:hover:bg-primary-600 dark:shadow-none",
    accent: "bg-accent-600 hover:bg-accent-700 text-white shadow-md shadow-accent-600/10 dark:bg-accent-500 dark:hover:bg-accent-600",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200",
    outline: "border border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-300",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/10 dark:bg-rose-500 dark:hover:bg-rose-600"
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      <span style={spanStyle}>{children}</span>
    </motion.button>
  );
}
