import React, { ReactNode, HTMLAttributes } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export interface CardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  hoverable?: boolean;
}

export function Card({ children, className = "", onClick, hoverable = true, ...props }: CardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hoverable ? { y: -2 } : undefined}
      transition={{ duration: 0.15 }}
      className={`glass-panel rounded-2xl shadow-sm hover:shadow-md p-4 md:p-5 lg:p-6 overflow-hidden transition-shadow duration-200 ${className} ${onClick ? "cursor-pointer" : ""}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "", ...props }: CardHeaderProps) {
  return (
    <div className={`mb-4 flex flex-col gap-1 ${className}`} {...props}>
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "", ...props }: CardTitleProps) {
  return (
    <h3
      className={`text-lg font-semibold text-slate-900 dark:text-slate-100 font-display tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  className?: string;
}

export function CardDescription({ children, className = "", ...props }: CardDescriptionProps) {
  return (
    <p
      className={`text-sm text-slate-500 dark:text-slate-400 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "", ...props }: CardContentProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "", ...props }: CardFooterProps) {
  return (
    <div className={`mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
}
