import React from 'react';
import { Activity, Moon, Sun, Wifi } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  isOnline: boolean;
  serverLocation?: string;
  userCity?: string;
  backendAvailable: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleTheme,
  isOnline,
  serverLocation,
  userCity,
  backendAvailable,
}) => {
  return (
    <header className="w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand identity & Creator credit */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white font-bold">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-lg text-slate-900 dark:text-white">
                VELOCE
              </span>
              <span className="text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-semibold">
                Speed Test
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden lg:inline">
                · India Edition
              </span>
            </div>
            {/* Upper navbar credits */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <span>Created by</span>
              <span className="font-semibold text-slate-900 dark:text-cyan-400">
                Arpan Goswami
              </span>
            </div>
          </div>
        </div>

        {/* Status & Settings */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs">
          {/* User Location */}
          {userCity && (
            <div className="hidden sm:flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span>{userCity}, India</span>
            </div>
          )}

          {/* Online status */}
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-400">
            <Wifi className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} />
            <span className="hidden sm:inline font-medium">{!isOnline ? 'Offline' : backendAvailable ? 'Test Ready' : 'API Offline'}</span>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-800" aria-hidden="true" />

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            {darkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline text-[11px] font-medium">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700" />
                <span className="hidden md:inline text-[11px] font-medium">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
