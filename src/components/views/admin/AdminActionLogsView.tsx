import React, { useEffect, useState } from "react";
import { adminService } from "../../../services/adminService";
import { AdminActionLog } from "../../../types/admin";
import { ShieldCheck, Clock, User, FileCode, RefreshCw } from "lucide-react";

export function AdminActionLogsView() {
  const [logs, setLogs] = useState<AdminActionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getActionLogs(100);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit action logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 font-display">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Admin Action Audit Logs
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Immutable audit record of all tier changes, account suspensions, and administrative role grants.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-4 py-4">Action Event</th>
                <th className="px-4 py-4">Target User ID</th>
                <th className="px-4 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32" /></td>
                    <td className="px-4 py-4"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-28" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-44" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-56" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No admin action logs recorded yet. Action logs are automatically captured when tier updates, suspensions, or role changes occur.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        log.action.includes('SUSPENDED') 
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' 
                          : log.action.includes('TIER')
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-xs font-mono text-slate-600 dark:text-slate-400">
                      {log.target_user_id || "—"}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-xs font-mono text-slate-500 dark:text-slate-400">
                      {JSON.stringify(log.details || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
