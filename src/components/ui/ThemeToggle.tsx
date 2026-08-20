import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const getThemeDetails = () => {
    switch (theme) {
      case "light":
        return {
          icon: <Sun className="w-5 h-5 text-amber-500" />,
          title: "Theme: Light (Click to change)",
          key: "sun"
        };
      case "dark":
        return {
          icon: <Moon className="w-5 h-5 text-indigo-500" />,
          title: "Theme: AMOLED Dark (Click to change)",
          key: "moon"
        };
      case "system":
      default:
        return {
          icon: <Monitor className="w-5 h-5 text-teal-500" />,
          title: "Theme: System (Click to change)",
          key: "system"
        };
    }
  };

  const { icon, title, key } = getThemeDetails();

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      onClick={toggleTheme}
      id="theme-toggle-btn"
      className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer overflow-hidden flex items-center justify-center w-10 h-10"
      title={title}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          initial={{ y: -20, rotate: -45, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: 20, rotate: 45, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center justify-center"
        >
          {icon}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
