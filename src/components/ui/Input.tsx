import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = "", id, ...props }, ref) => {
    const uniqueId = id || Math.random().toString(36).substring(2, 9);
    
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label 
            htmlFor={uniqueId}
            className="text-[11px] font-bold text-[#A3AABF] uppercase tracking-wider font-display"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={uniqueId}
            ref={ref}
            className={`w-full px-4 py-2.5 min-h-[44px] sm:min-h-0 bg-white dark:bg-slate-900 border ${
              error 
                ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" 
                : "border-slate-200 focus:ring-primary-500/10 focus:border-primary-500 dark:border-slate-800"
            } rounded-xl text-sm text-slate-900 dark:text-[#F1F3FA] placeholder-[#5B6278] placeholder:italic [color-scheme:light] dark:[color-scheme:dark] transition-all focus:outline-none focus:ring-4 ${
              leftIcon ? "pl-11" : ""
            } ${rightIcon ? "pr-11" : ""} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-rose-500 mt-0.5 font-medium">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const uniqueId = id || Math.random().toString(36).substring(2, 9);
    
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label 
            htmlFor={uniqueId}
            className="text-[11px] font-bold text-[#A3AABF] uppercase tracking-wider font-display"
          >
            {label}
          </label>
        )}
        <textarea
          id={uniqueId}
          ref={ref}
          className={`w-full px-4 py-2.5 min-h-[100px] bg-white dark:bg-slate-900 border ${
            error 
              ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" 
              : "border-slate-200 focus:ring-primary-500/10 focus:border-primary-500 dark:border-slate-800"
          } rounded-xl text-sm text-slate-900 dark:text-[#F1F3FA] placeholder-[#5B6278] placeholder:italic transition-all focus:outline-none focus:ring-4 ${className}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-rose-500 mt-0.5 font-medium">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{helperText}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
