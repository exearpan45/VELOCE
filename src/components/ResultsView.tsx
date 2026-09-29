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

  // Generate shareable text summary
  const summaryText = `⚡ Veloce Internet Speed Test Results (India)
${userCity ? `📍 User City: ${userCity}, India\n` : ''}⬇️ Download: ${result.download.avgMbps} Mbps (Peak: ${result.download.peakMbps} Mbps)
⬆️ Upload: ${result.upload.avgMbps} Mbps (Peak: ${result.upload.peakMbps} Mbps)
📶 Ping: ${result.ping.avg} ms (Min: ${result.ping.min} ms, Max: ${result.ping.max} ms)
📊 Jitter: ${result.ping.jitter} ms
⏱️ Test Duration: ${result.durationSeconds}s
🌐 Server: ${result.server.name}
📅 Timestamp: ${result.dateString}
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
      } catch (err) {
        // Fall back to clipboard if user dismissed or permission denied
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

  // Connection performance tier evaluations
  const isGoodFor4K = result.download.avgMbps >= 25;
  const isGoodForGaming = result.ping.avg <= 45 && result.ping.jitter <= 10;
  const isGoodForVideoCalls = result.download.avgMbps >= 10 && result.upload.avgMbps >= 5 && result.ping.avg <= 80;
  const isGigabitTier = result.download.avgMbps >= 300;

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Primary Results Banner */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              <CheckCircle2 className="w-4 h-4" />
              <span>Test Completed · 100% Genuine Network Data</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
              Your Broadband Connection Speed
            </h2>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
              Tested on {result.dateString} · Duration: {result.durationSeconds}s
              {userCity ? ` · Location: ${userCity}, India` : ''}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-900 dark:text-white transition-all shadow-sm focus-visible:outline-2 focus-visible:outline-cyan-500"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share Results</span>
                </>
              )}
            </button>

            <button
              onClick={onRestart}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-black text-white transition-all shadow-md shadow-cyan-500/20 focus-visible:outline-2 focus-visible:outline-cyan-500"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>TEST AGAIN</span>
            </button>
          </div>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Download */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              <ArrowDown className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Download</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {result.download.avgMbps}
              </span>
              <span className="text-xs uppercase font-mono text-slate-600 dark:text-slate-400 font-semibold">Mbps</span>
            </div>
            <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-400 font-mono space-y-0.5 border-t border-slate-200 dark:border-slate-800/60 pt-2 font-medium">
              <div className="flex justify-between">
                <span>Peak Throughput:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{result.download.peakMbps} Mbps</span>
              </div>
              <div className="flex justify-between">
                <span>Actual Transferred:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{(result.download.totalBytes / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
            </div>
          </div>

          {/* Upload */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              <ArrowUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>Upload</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {result.upload.avgMbps}
              </span>
              <span className="text-xs uppercase font-mono text-slate-600 dark:text-slate-400 font-semibold">Mbps</span>
            </div>
            <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-400 font-mono space-y-0.5 border-t border-slate-200 dark:border-slate-800/60 pt-2 font-medium">
              <div className="flex justify-between">
                <span>Peak Throughput:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{result.upload.peakMbps} Mbps</span>
              </div>
              <div className="flex justify-between">
                <span>Actual Uploaded:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{(result.upload.totalBytes / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
            </div>
          </div>

          {/* Ping */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              <Radio className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Ping (Latency)</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {result.ping.avg}
              </span>
              <span className="text-xs uppercase font-mono text-slate-600 dark:text-slate-400 font-semibold">ms</span>
            </div>
            <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-400 font-mono space-y-0.5 border-t border-slate-200 dark:border-slate-800/60 pt-2 font-medium">
              <div className="flex justify-between">
                <span>Minimum:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{result.ping.min} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Median:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{result.ping.median} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Maximum:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{result.ping.max} ms</span>
              </div>
            </div>
          </div>

          {/* Jitter */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Jitter</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {result.ping.jitter}
              </span>
              <span className="text-xs uppercase font-mono text-slate-600 dark:text-slate-400 font-semibold">ms</span>
            </div>
            <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-400 font-mono space-y-0.5 border-t border-slate-200 dark:border-slate-800/60 pt-2 font-medium">
              <div className="flex justify-between">
                <span>Line Stability:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {result.ping.jitter < 4 ? 'Ultra Stable' : result.ping.jitter < 15 ? 'Good' : 'Variable'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Calculation:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">RFC 3550 Variance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-World Use Suitability Assessment */}
        <div className="mt-6 border-t border-slate-200 dark:border-slate-800/80 pt-5">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
            Real-World Application Readiness
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${isGoodFor4K ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">4K UHD Video</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">{isGoodFor4K ? 'Flawless Streaming' : 'Standard'}</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${isGoodForGaming ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Online Gaming</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">{isGoodForGaming ? 'Low Latency' : 'Moderate'}</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${isGoodForVideoCalls ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Video Meetings</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">{isGoodForVideoCalls ? 'HD Supported' : 'Audio Only'}</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${isGigabitTier ? 'bg-cyan-500' : 'bg-slate-400'}`} />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Cloud Backups</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">{isGigabitTier ? 'Fiber High-Speed' : 'Standard'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Server & Node information */}
        <div className="mt-6 border-t border-slate-200 dark:border-slate-800/80 pt-4 flex flex-wrap items-center justify-between text-xs text-slate-700 dark:text-slate-400 font-mono gap-y-2">
          <div className="flex items-center gap-3">
            <span>Server: <strong className="text-slate-900 dark:text-slate-200">{result.server.name}</strong></span>
            <span>·</span>
            <span>Target: <strong className="text-slate-900 dark:text-slate-200">{result.server.location}</strong></span>
          </div>
          <div>
            Client IP: <strong className="text-slate-900 dark:text-slate-200">{result.server.clientIp}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
