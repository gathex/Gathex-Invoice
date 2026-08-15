import React from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { GathexLogo } from "./GathexLogo";

export function AppLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden font-sans flex flex-col justify-between select-none">
      {/* Background Ambient Glow & Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Main Skeleton Application Shell (Background) */}
      <div className="absolute inset-0 flex pointer-events-none opacity-20 filter blur-[1px]">
        {/* Sidebar Skeleton */}
        <aside className="hidden lg:flex w-72 flex-col justify-between border-r border-slate-800 bg-slate-900/50 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 animate-pulse" />
            <div className="space-y-2">
              <div className="w-24 h-4 bg-slate-800 rounded animate-pulse" />
              <div className="w-16 h-3 bg-slate-800/60 rounded animate-pulse" />
            </div>
          </div>

          <div className="space-y-3 flex-1 pt-6">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 animate-pulse">
                <div className="w-5 h-5 bg-slate-700/60 rounded" />
                <div className="w-28 h-3.5 bg-slate-700/60 rounded" />
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl flex items-center gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-slate-700/80" />
            <div className="space-y-1.5 flex-1">
              <div className="w-20 h-3 bg-slate-700/80 rounded" />
              <div className="w-28 h-2.5 bg-slate-700/40 rounded" />
            </div>
          </div>
        </aside>

        {/* Content Skeleton */}
        <main className="flex-1 flex flex-col p-6 space-y-6">
          <div className="h-16 bg-slate-900/40 rounded-2xl border border-slate-800/50 flex items-center justify-between px-6 animate-pulse">
            <div className="w-48 h-5 bg-slate-800 rounded" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800" />
              <div className="w-8 h-8 rounded-full bg-slate-800" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-900/40 rounded-2xl border border-slate-800/50 p-4 space-y-3 animate-pulse">
                <div className="w-20 h-3 bg-slate-800 rounded" />
                <div className="w-32 h-6 bg-slate-700/60 rounded" />
                <div className="w-24 h-2.5 bg-slate-800/40 rounded" />
              </div>
            ))}
          </div>

          <div className="flex-1 bg-slate-900/40 rounded-2xl border border-slate-800/50 p-6 animate-pulse" />
        </main>
      </div>

      {/* Foreground Centered Logo & Loading Banner */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center gap-6 shadow-indigo-950/40">
          
          {/* App Logo Mark */}
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl bg-slate-900 p-1 shadow-2xl shadow-indigo-600/30 ring-4 ring-indigo-500/30 flex items-center justify-center">
              <GathexLogo className="w-20 h-20" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1.5 rounded-full ring-4 ring-slate-900 text-slate-950 shadow-md">
              <ShieldCheck className="w-4 h-4 stroke-[3]" />
            </div>
          </div>

          {/* App Name & Branding Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl font-extrabold font-display tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                GATHEX
              </h1>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-800/50">
                PRO
              </span>
            </div>
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-indigo-400/90 font-display">
              INVOICE & GST LEDGER
            </p>
          </div>

          {/* Progress / Status Indicator */}
          <div className="w-full space-y-3 pt-2">
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden p-0.5 border border-slate-700/50">
              <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 h-full rounded-full animate-[loading-bar_1.8s_ease-in-out_infinite]" />
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Verifying ledger node & profile...</span>
            </div>
          </div>

        </div>

        {/* Footer Subtext */}
        <p className="mt-8 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
          GATHEX SECURE ENTERPRISE NODE v5.5 • END-TO-END ENCRYPTED
        </p>
      </div>
    </div>
  );
}
