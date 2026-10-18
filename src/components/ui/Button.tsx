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

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
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
  size = "md",
  loading = false, 
  icon, 
  className = "", 
  disabled,
  type = "button",
  onClick,
  spanStyle,
  ...props 
}: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none font-sans";
  
  const sizes = {
    sm: "h-9 min-h-[36px] sm:min-h-0 px-3 text-xs gap-1.5",
    md: "h-10 min-h-[44px] sm:min-h-0 px-4 text-sm",
    lg: "h-11 min-h-[44px] sm:min-h-0 px-6 text-sm font-semibold",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

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
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children && <span style={spanStyle}>{children}</span>}
    </motion.button>
  );
}
