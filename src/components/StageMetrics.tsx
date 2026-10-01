import React from 'react';
import { ArrowDown, ArrowUp, Gauge, Radio } from 'lucide-react';
import { PingMetrics, SpeedMeasurement, TestState } from '../types/speedtest';

interface StageMetricsProps {
  state: TestState;
  ping: PingMetrics | null;
  download: SpeedMeasurement | null;
  upload: SpeedMeasurement | null;
}

export const StageMetrics: React.FC<StageMetricsProps> = ({
  state,
  ping,
  download,
  upload,
}) => {
  const isPingActive = state === 'PING_TEST';
  const isDownloadActive = state === 'DOWNLOAD_TEST';
  const isUploadActive = state === 'UPLOAD_TEST';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full">
      {/* 1. Ping Metric Card */}
      <div
        className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 shadow-sm ${
          isPingActive
            ? 'bg-sky-50/80 dark:bg-slate-900 border-sky-500 ring-2 ring-sky-500/20'
            : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Radio className={`w-3.5 h-3.5 ${isPingActive ? 'text-sky-600 dark:text-sky-400 animate-pulse' : 'text-slate-500'}`} />
            <span>Ping</span>
          </div>
          {isPingActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {ping ? Math.round(ping.current) : '--'}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">ms</span>
        </div>
        <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono border-t border-slate-100 dark:border-slate-800/80 pt-1.5 font-medium">
          <span>Min: {ping ? ping.min : '--'}</span>
          <span>Max: {ping ? ping.max : '--'}</span>
        </div>
      </div>

      {/* 2. Jitter Metric Card */}
      <div
        className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 shadow-sm ${
          isPingActive
            ? 'bg-sky-50/80 dark:bg-slate-900 border-sky-500 ring-2 ring-sky-500/20'
            : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Gauge className={`w-3.5 h-3.5 ${isPingActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500'}`} />
            <span>Jitter</span>
          </div>
          {isPingActive && (
            <span className="text-[9px] font-mono text-sky-600 dark:text-sky-400 font-bold">RFC3550</span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {ping ? Math.round(ping.jitter) : '--'}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">ms</span>
        </div>
        <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono border-t border-slate-100 dark:border-slate-800/80 pt-1.5 font-medium">
          <span>Line</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {ping && ping.jitter < 5 ? 'Ultra' : ping ? 'Good' : '--'}
          </span>
        </div>
      </div>

      {/* 3. Download Metric Card */}
      <div
        className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 shadow-sm ${
          isDownloadActive
            ? 'bg-cyan-50/80 dark:bg-slate-900 border-cyan-500 ring-2 ring-cyan-500/20'
            : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <ArrowDown className={`w-3.5 h-3.5 ${isDownloadActive ? 'text-cyan-600 dark:text-cyan-400 animate-bounce' : 'text-slate-500'}`} />
            <span>Download</span>
          </div>
          {isDownloadActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {download ? download.currentMbps.toFixed(download.currentMbps < 10 ? 2 : 1) : '--'}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">Mbps</span>
        </div>
        <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono border-t border-slate-100 dark:border-slate-800/80 pt-1.5 font-medium truncate">
          <span>Peak: {download ? `${download.peakMbps.toFixed(1)}M` : '--'}</span>
          <span>{download ? `${(download.bytesTransferred / (1024 * 1024)).toFixed(1)}MB` : '--'}</span>
        </div>
      </div>

      {/* 4. Upload Metric Card */}
      <div
        className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 shadow-sm ${
          isUploadActive
            ? 'bg-violet-50/80 dark:bg-slate-900 border-violet-500 ring-2 ring-violet-500/20'
            : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <ArrowUp className={`w-3.5 h-3.5 ${isUploadActive ? 'text-violet-600 dark:text-violet-400 animate-bounce' : 'text-slate-500'}`} />
            <span>Upload</span>
          </div>
          {isUploadActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping" />
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {upload ? upload.currentMbps.toFixed(upload.currentMbps < 10 ? 2 : 1) : '--'}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">Mbps</span>
        </div>
        <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono border-t border-slate-100 dark:border-slate-800/80 pt-1.5 font-medium truncate">
          <span>Peak: {upload ? `${upload.peakMbps.toFixed(1)}M` : '--'}</span>
          <span>{upload ? `${(upload.bytesTransferred / (1024 * 1024)).toFixed(1)}MB` : '--'}</span>
        </div>
      </div>
    </div>
  );
};
