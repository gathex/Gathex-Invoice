import { SelectHTMLAttributes, forwardRef, ReactNode } from "react";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  children?: ReactNode;
  className?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, children, className = "", id, ...props }, ref) => {
    const uniqueId = id || Math.random().toString(36).substring(2, 9);
    
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label 
            htmlFor={uniqueId}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-display tracking-tight"
          >
            {label}
          </label>
        )}
        <select
          id={uniqueId}
          ref={ref}
          className={`w-full px-4 py-2.5 min-h-[44px] sm:min-h-0 bg-white dark:bg-slate-900 border ${
            error 
              ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" 
              : "border-slate-200 focus:ring-primary-500/10 focus:border-primary-500 dark:border-slate-800"
          } rounded-xl text-sm text-slate-900 dark:text-slate-100 transition-all focus:outline-none focus:ring-4 appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat ${className}`}
          {...props}
        >
          {children ? children : options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
Select.displayName = "Select";
