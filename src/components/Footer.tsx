import React from 'react';
import { Activity, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950 mt-20 py-12 text-slate-600 dark:text-slate-400 text-xs transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
              <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="font-bold tracking-tight text-slate-900 dark:text-white text-sm">
              VELOCE SPEED TEST
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              · India
            </span>
          </div>

          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Tracking · 100% Genuine Physical Socket Telemetry</span>
          </div>
        </div>

        {/* Privacy & Methodology Disclosure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-900 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Privacy & Integrity Guarantee
            </h4>
            <p>
              Veloce does not collect personal identifiers, persist user locations, store browsing logs, or track cookies. Tests execute purely across real browser HTTP streams against high-speed test servers.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Real Network Measurements
            </h4>
            <p>
              Latency, jitter, download, and upload speeds are calculated in real time using the W3C High Resolution Time API and true binary chunk transfer. No simulated or randomized numbers are ever used.
            </p>
          </div>
        </div>

        {/* Lower Navbar Rights & Developer Credit */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 dark:text-slate-400 text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} Veloce Speed Test. All rights reserved by developer.
          </div>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <span>Direct Socket Engine</span>
            <span>·</span>
            <span>Made for Indian Users</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
