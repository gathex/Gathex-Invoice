import { ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Dialog({ isOpen, onClose, title, children, size = "md" }: DialogProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const sizes = {
    sm: "md:max-w-md",
    md: "md:max-w-lg",
    lg: "md:max-w-2xl",
    xl: "md:max-w-4xl"
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
          />

          {/* Modal Container — full-screen on mobile, centered panel on md+ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full ${sizes[size]} glass-panel md:rounded-2xl rounded-t-2xl shadow-2xl p-4 md:p-6 bg-white dark:bg-slate-900 z-10 flex flex-col max-h-[100dvh] md:max-h-[90vh]`}
          >
            {/* Header — always visible, never scrolls away */}
            <div className="flex items-center justify-between pb-3 md:pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-3 md:mb-4 flex-shrink-0">
              <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 font-display tracking-tight pr-8">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-2 md:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
