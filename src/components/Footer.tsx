import React from 'react';
import { Activity, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950 mt-10 py-6 text-slate-600 dark:text-slate-400 text-xs transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shrink-0">
              <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="font-bold tracking-tight text-slate-900 dark:text-white text-xs sm:text-sm">
              VELOCE SPEED TEST
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              · India
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Tracking · 100% Genuine Speed</span>
          </div>
        </div>

        {/* Lower Navbar Rights & Developer Credit */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 dark:text-slate-400 text-[11px] text-center sm:text-left">
          <div>
            &copy; {new Date().getFullYear()} Veloce. All rights reserved by developer.
          </div>
          <div>
            Created by <strong className="text-slate-800 dark:text-slate-200 font-semibold">Arpan Goswami</strong>
          </div>
        </div>
      </div>
    </footer>
  );
};
