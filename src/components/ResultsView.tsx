import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Radio,
  RotateCcw,
  Share2,
  Zap,
} from 'lucide-react';
import { TestResult } from '../types/speedtest';

interface ResultsViewProps {
  result: TestResult;
  onRestart: () => void;
  userCity?: string;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ result, onRestart, userCity }) => {
  const [copied, setCopied] = useState(false);

  const summaryText = `⚡ Veloce Internet Speed Test Results (India)
${userCity ? `📍 User City: ${userCity}, India\n` : ''}⬇️ Download: ${result.download.avgMbps} Mbps (Peak: ${result.download.peakMbps} Mbps)
⬆️ Upload: ${result.upload.avgMbps} Mbps (Peak: ${result.upload.peakMbps} Mbps)
📶 Ping: ${result.ping.avg} ms (Min: ${result.ping.min} ms, Max: ${result.ping.max} ms)
📊 Jitter: ${result.ping.jitter} ms
⏱️ Test Duration: ${result.durationSeconds}s
🌐 Server: ${result.server.name}
Tested on Veloce Speed Test`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Veloce Internet Speed Test Results',
          text: summaryText,
          url: window.location.href,
        });
        return;
      } catch {
        // Fall back to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const isGoodFor4K = result.download.avgMbps >= 25;
  const isGoodForGaming = result.ping.avg <= 45 && result.ping.jitter <= 10;
  const isGoodForVideoCalls = result.download.avgMbps >= 10 && result.upload.avgMbps >= 5 && result.ping.avg <= 80;
  const isGigabitTier = result.download.avgMbps >= 300;

  return (
    <div className="w-full space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Primary Results Banner */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4 sm:pb-6 mb-4 sm:mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Test Completed · Genuine Network Data</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
              Broadband Speed Results
            </h2>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              Duration: {result.durationSeconds}s
              {userCity ? ` · ${userCity}, India` : ''}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handleShare}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white transition-all touch-manipulation shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>

            <button
              onClick={onRestart}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-black text-white transition-all touch-manipulation shadow-md shadow-cyan-500/20"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>TEST AGAIN</span>
            </button>
          </div>
        </div>

        {/* 2x2 on Mobile, 4-col on Desktop Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Download */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              <ArrowDown className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Download</span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {result.download.avgMbps}
              </span>
              <span className="text-[10px] sm:text-xs uppercase font-mono text-slate-500 dark:text-slate-400 font-semibold">Mbps</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono space-y-0.5 border-t border-slate-100 dark:border-slate-800/60 pt-1.5 font-medium">
              <div className="flex justify-between">
                <span>Peak:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{result.download.peakMbps}M</span>
              </div>
            </div>
          </div>

          {/* Upload */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              <ArrowUp className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span>Upload</span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {result.upload.avgMbps}
              </span>
              <span className="text-[10px] sm:text-xs uppercase font-mono text-slate-500 dark:text-slate-400 font-semibold">Mbps</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono space-y-0.5 border-t border-slate-100 dark:border-slate-800/60 pt-1.5 font-medium">
              <div className="flex justify-between">
                <span>Peak:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{result.upload.peakMbps}M</span>
              </div>
            </div>
          </div>

          {/* Ping */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              <Radio className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Ping</span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {result.ping.avg}
              </span>
              <span className="text-[10px] sm:text-xs uppercase font-mono text-slate-500 dark:text-slate-400 font-semibold">ms</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono space-y-0.5 border-t border-slate-100 dark:border-slate-800/60 pt-1.5 font-medium">
              <div className="flex justify-between">
                <span>Min / Max:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{result.ping.min} / {result.ping.max}ms</span>
              </div>
            </div>
          </div>

          {/* Jitter */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Jitter</span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {result.ping.jitter}
              </span>
              <span className="text-[10px] sm:text-xs uppercase font-mono text-slate-500 dark:text-slate-400 font-semibold">ms</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono space-y-0.5 border-t border-slate-100 dark:border-slate-800/60 pt-1.5 font-medium">
              <div className="flex justify-between">
                <span>Stability:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {result.ping.jitter < 4 ? 'Ultra' : result.ping.jitter < 15 ? 'Good' : 'Variable'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-World Readiness Grid */}
        <div className="mt-4 sm:mt-6 border-t border-slate-200 dark:border-slate-800/80 pt-3 sm:pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isGoodFor4K ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div className="min-w-0">
                <div className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs truncate">4K Streaming</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{isGoodFor4K ? 'Ready' : 'Moderate'}</div>
              </div>
            </div>

            <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isGoodForGaming ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div className="min-w-0">
                <div className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs truncate">Online Gaming</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{isGoodForGaming ? 'Low Latency' : 'Moderate'}</div>
              </div>
            </div>

            <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isGoodForVideoCalls ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div className="min-w-0">
                <div className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs truncate">Video Calls</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{isGoodForVideoCalls ? 'HD Ready' : 'Standard'}</div>
              </div>
            </div>

            <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isGigabitTier ? 'bg-cyan-500' : 'bg-slate-400'}`} />
              <div className="min-w-0">
                <div className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs truncate">Cloud Backups</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{isGigabitTier ? 'Fiber High-Speed' : 'Standard'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Server node info */}
        <div className="mt-4 border-t border-slate-200 dark:border-slate-800/80 pt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <span>Server: <strong className="text-slate-800 dark:text-slate-200">{result.server.name}</strong></span>
          <span>IP: <strong className="text-slate-800 dark:text-slate-200">{result.server.clientIp}</strong></span>
        </div>
      </div>
    </div>
  );
};
