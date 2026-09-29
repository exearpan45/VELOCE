import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Play,
  Square,
} from 'lucide-react';
import {
  GraphPoint,
  PingMetrics,
  ServerConfig,
  SpeedMeasurement,
  TestResult,
  TestState,
} from './types/speedtest';
import { SpeedTestEngine } from './utils/speedEngine';
import { Header } from './components/Header';
import { SpeedGauge } from './components/SpeedGauge';
import { StageMetrics } from './components/StageMetrics';
import { LiveGraph } from './components/LiveGraph';
import { ResultsView } from './components/ResultsView';
import { NetworkDiagnostics } from './components/NetworkDiagnostics';
import { EducationalSection } from './components/EducationalSection';
import { Footer } from './components/Footer';

export default function App() {
  const [state, setState] = useState<TestState>('IDLE');
  const [pingMetrics, setPingMetrics] = useState<PingMetrics | null>(null);
  const [downloadMeasurement, setDownloadMeasurement] = useState<SpeedMeasurement | null>(null);
  const [uploadMeasurement, setUploadMeasurement] = useState<SpeedMeasurement | null>(null);
  const [graphPoints, setGraphPoints] = useState<GraphPoint[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // DEFAULT LIGHT MODE (100% clean and readable)
  const [darkMode, setDarkMode] = useState(false);
  
  // User Indian location state (defaults to New Delhi, India)
  const [userCity, setUserCity] = useState('New Delhi');

  const engineRef = useRef<SpeedTestEngine | null>(null);

  // Monitor online / offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync dark mode class on document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('bg-slate-50', 'text-slate-900');
      document.body.classList.add('bg-slate-950', 'text-slate-100');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-slate-950', 'text-slate-100');
      document.body.classList.add('bg-slate-50', 'text-slate-900');
    }
  }, [darkMode]);

  // Initial server probe to fetch config
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setServerConfig(data))
      .catch(() => {
        // Fallback server config
      });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.abort();
      }
    };
  }, []);

  // Start test handler
  const handleStartTest = useCallback(() => {
    if (state !== 'IDLE' && state !== 'COMPLETED' && state !== 'CANCELLED' && state !== 'ERROR') {
      return;
    }

    setErrorMessage(null);
    setResult(null);
    setPingMetrics(null);
    setDownloadMeasurement(null);
    setUploadMeasurement(null);
    setGraphPoints([]);

    const engine = new SpeedTestEngine({
      onStateChange: (newState) => setState(newState as TestState),
      onPingUpdate: (metrics) => setPingMetrics(metrics),
      onDownloadUpdate: (meas) => setDownloadMeasurement(meas),
      onUploadUpdate: (meas) => setUploadMeasurement(meas),
      onGraphPoint: (pt) => setGraphPoints((prev) => [...prev, pt]),
      onComplete: (finalResult) => setResult(finalResult),
      onError: (err) => setErrorMessage(err),
    });

    engineRef.current = engine;
    engine.start();
  }, [state]);

  // Stop test handler
  const handleStopTest = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.abort();
      engineRef.current = null;
    }
  }, []);

  // Determine current active speed value for central gauge
  const currentGaugeValue = useMemo(() => {
    if (state === 'PING_TEST') {
      return pingMetrics?.current || 0;
    }
    if (state === 'DOWNLOAD_TEST') {
      return downloadMeasurement?.currentMbps || 0;
    }
    if (state === 'UPLOAD_TEST') {
      return uploadMeasurement?.currentMbps || 0;
    }
    if (state === 'COMPLETED' && result) {
      return result.download.avgMbps;
    }
    return 0;
  }, [state, pingMetrics, downloadMeasurement, uploadMeasurement, result]);

  const currentPeakValue = useMemo(() => {
    if (state === 'DOWNLOAD_TEST') {
      return downloadMeasurement?.peakMbps || 0;
    }
    if (state === 'UPLOAD_TEST') {
      return uploadMeasurement?.peakMbps || 0;
    }
    return 0;
  }, [state, downloadMeasurement, uploadMeasurement]);

  const isTestingActive =
    state === 'PREPARING' ||
    state === 'PING_TEST' ||
    state === 'DOWNLOAD_TEST' ||
    state === 'UPLOAD_TEST';

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200`}>
      {/* Navigation Header with Creator Credit */}
      <Header
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        isOnline={isOnline}
        serverLocation={serverConfig?.serverLocation}
        userCity={userCity}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-16">
        {/* Hero Banner Header */}
        <section className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Internet Speed Test
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
            Measure your genuine download, upload, ping latency, and jitter on Indian broadband networks.
          </p>
        </section>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-8 p-4 rounded-xl border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 flex items-start gap-3 text-sm animate-fadeIn"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold block">Test Interrupted</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Main Testing View */}
        {state === 'COMPLETED' && result ? (
          /* Results View Card */
          <ResultsView
            result={result}
            onRestart={handleStartTest}
            userCity={userCity}
          />
        ) : (
          /* Live Speed Test Interface */
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm space-y-8 transition-colors duration-200">
            {/* Speed Gauge Display */}
            <div className="flex flex-col items-center justify-center">
              <SpeedGauge
                value={currentGaugeValue}
                state={state}
                unit={state === 'PING_TEST' ? 'ms' : 'Mbps'}
                peakValue={currentPeakValue}
              />

              {/* Main Action Trigger Button */}
              <div className="mt-4 flex flex-col items-center gap-2">
                {!isTestingActive ? (
                  <button
                    onClick={handleStartTest}
                    disabled={!isOnline}
                    aria-label="Start broadband speed test"
                    className="group relative inline-flex items-center gap-3 px-8 sm:px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-4 focus-visible:outline-cyan-500"
                  >
                    <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                    <span>START SPEED TEST</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopTest}
                    aria-label="Stop current test"
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl border border-rose-300 dark:border-rose-500/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 font-bold text-xs uppercase tracking-wider transition-all shadow-md focus-visible:outline-2 focus-visible:outline-rose-500"
                  >
                    <Square className="w-4 h-4 fill-rose-600 dark:fill-rose-300" />
                    <span>STOP TEST</span>
                  </button>
                )}

                {!isOnline && (
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    You appear to be offline. Reconnect to run test.
                  </span>
                )}
              </div>
            </div>

            {/* Live 4-Metric Display Grid */}
            <StageMetrics
              state={state}
              ping={pingMetrics}
              download={downloadMeasurement}
              upload={uploadMeasurement}
            />

            {/* Live Real-time Waveform Canvas */}
            <LiveGraph
              points={graphPoints}
              currentStage={state === 'UPLOAD_TEST' ? 'upload' : 'download'}
              darkMode={darkMode}
            />
          </div>
        )}

        {/* Network & Indian Diagnostic Details Card */}
        <div className="mt-8">
          <NetworkDiagnostics
            serverConfig={serverConfig}
            userCity={userCity}
            onChangeUserCity={(city) => setUserCity(city)}
          />
        </div>

        {/* SEO Educational & Comprehensive FAQ Content (100% Ad-Free) */}
        <EducationalSection />
      </main>

      {/* Global Footer with All Rights Reserved by Developer */}
      <Footer />
    </div>
  );
}
