import {
  PingMetrics,
  SpeedMeasurement,
  TestResult,
  ServerConfig,
  GraphPoint,
} from '../types/speedtest';

export interface SpeedTestCallbacks {
  onStateChange: (state: string) => void;
  onPingUpdate: (metrics: PingMetrics) => void;
  onDownloadUpdate: (measurement: SpeedMeasurement) => void;
  onUploadUpdate: (measurement: SpeedMeasurement) => void;
  onGraphPoint: (point: GraphPoint) => void;
  onComplete: (result: TestResult) => void;
  onError: (error: string) => void;
}

export class SpeedTestEngine {
  private abortController: AbortController | null = null;
  private isRunning = false;
  private callbacks: SpeedTestCallbacks;
  private serverConfig: ServerConfig | null = null;

  constructor(callbacks: SpeedTestCallbacks) {
    this.callbacks = callbacks;
  }

  public abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isRunning = false;
    this.callbacks.onStateChange('CANCELLED');
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const testStartTime = performance.now();
    const graphPoints: GraphPoint[] = [];

    try {
      // ---------------------------------------------------------
      // Stage 1: Preparation
      // ---------------------------------------------------------
      this.callbacks.onStateChange('PREPARING');

      // Fetch server config & verify connectivity
      const configRes = await fetch(`/api/config?t=${Date.now()}`, {
        signal,
        cache: 'no-store',
      });

      if (!configRes.ok) {
        throw new Error(`Speed test server returned status ${configRes.status}.`);
      }

      this.serverConfig = await configRes.json();
      if (signal.aborted) return;

      // Small pause for clean UI transition
      await new Promise((r) => setTimeout(r, 400));
      if (signal.aborted) return;

      // ---------------------------------------------------------
      // Stage 2: Ping & Jitter Test (10 sequential round-trips)
      // ---------------------------------------------------------
      this.callbacks.onStateChange('PING_TEST');

      const pingSamples: number[] = [];
      const totalPings = 10;

      for (let i = 0; i < totalPings; i++) {
        if (signal.aborted) return;

        const pingStart = performance.now();
        const pingRes = await fetch(`/api/ping?t=${Date.now()}_${i}`, {
          signal,
          cache: 'no-store',
          headers: { Pragma: 'no-cache' },
        });

        if (!pingRes.ok && pingRes.status !== 204) {
          throw new Error('Ping request failed. Please check your internet connection.');
        }

        const rtt = Math.max(1, performance.now() - pingStart);
        pingSamples.push(rtt);

        // Calculate statistics
        const sorted = [...pingSamples].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const sum = pingSamples.reduce((acc, val) => acc + val, 0);
        const avg = sum / pingSamples.length;
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

        // Jitter: RFC 3550 mean successive absolute difference
        let jitter = 0;
        if (pingSamples.length > 1) {
          let jitterSum = 0;
          for (let j = 1; j < pingSamples.length; j++) {
            jitterSum += Math.abs(pingSamples[j] - pingSamples[j - 1]);
          }
          jitter = jitterSum / (pingSamples.length - 1);
        }

        this.callbacks.onPingUpdate({
          current: Math.round(rtt * 10) / 10,
          min: Math.round(min * 10) / 10,
          max: Math.round(max * 10) / 10,
          avg: Math.round(avg * 10) / 10,
          median: Math.round(median * 10) / 10,
          jitter: Math.round(jitter * 10) / 10,
          samples: [...pingSamples],
          progress: (i + 1) / totalPings,
        });

        // Small delay between pings to avoid packet congestion
        await new Promise((r) => setTimeout(r, 60));
      }

      if (signal.aborted) return;
      await new Promise((r) => setTimeout(r, 300));
      if (signal.aborted) return;

      // ---------------------------------------------------------
      // Stage 3: Download Test (Real binary stream transfer)
      // ---------------------------------------------------------
      this.callbacks.onStateChange('DOWNLOAD_TEST');

      const downloadResult = await this.runDownloadMeasurement(signal, (pt) => {
        graphPoints.push(pt);
        this.callbacks.onGraphPoint(pt);
      });

      if (signal.aborted) return;
      await new Promise((r) => setTimeout(r, 400));
      if (signal.aborted) return;

      // ---------------------------------------------------------
      // Stage 4: Upload Test (Real chunked POST transfer)
      // ---------------------------------------------------------
      this.callbacks.onStateChange('UPLOAD_TEST');

      const uploadResult = await this.runUploadMeasurement(signal, (pt) => {
        graphPoints.push(pt);
        this.callbacks.onGraphPoint(pt);
      });

      if (signal.aborted) return;

      // ---------------------------------------------------------
      // Stage 5: Finalize & Compile Results
      // ---------------------------------------------------------
      this.callbacks.onStateChange('COMPLETED');
      this.isRunning = false;

      const totalDuration = (performance.now() - testStartTime) / 1000;

      // Compute final ping metrics
      const sortedPings = [...pingSamples].sort((a, b) => a - b);
      const pingSum = pingSamples.reduce((a, b) => a + b, 0);
      const pingAvg = pingSum / pingSamples.length;
      let finalJitter = 0;
      if (pingSamples.length > 1) {
        let diffSum = 0;
        for (let j = 1; j < pingSamples.length; j++) {
          diffSum += Math.abs(pingSamples[j] - pingSamples[j - 1]);
        }
        finalJitter = diffSum / (pingSamples.length - 1);
      }
      const midIdx = Math.floor(sortedPings.length / 2);
      const pingMedian = sortedPings.length % 2 !== 0 ? sortedPings[midIdx] : (sortedPings[midIdx - 1] + sortedPings[midIdx]) / 2;

      // Browser Network Information API (if supported)
      const navConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const connectionInfo = {
        effectiveType: navConn?.effectiveType || undefined,
        downlink: navConn?.downlink || undefined,
        rtt: navConn?.rtt || undefined,
        saveData: navConn?.saveData || false,
        online: navigator.onLine,
      };

      const finalResult: TestResult = {
        id: 'test-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        timestamp: Date.now(),
        dateString: new Date().toLocaleString(),
        durationSeconds: Math.round(totalDuration * 10) / 10,
        ping: {
          avg: Math.round(pingAvg * 10) / 10,
          min: Math.round(sortedPings[0] * 10) / 10,
          max: Math.round(sortedPings[sortedPings.length - 1] * 10) / 10,
          median: Math.round(pingMedian * 10) / 10,
          jitter: Math.round(finalJitter * 10) / 10,
        },
        download: {
          avgMbps: Math.round(downloadResult.averageMbps * 100) / 100,
          peakMbps: Math.round(downloadResult.peakMbps * 100) / 100,
          totalBytes: downloadResult.totalBytes,
        },
        upload: {
          avgMbps: Math.round(uploadResult.averageMbps * 100) / 100,
          peakMbps: Math.round(uploadResult.peakMbps * 100) / 100,
          totalBytes: uploadResult.totalBytes,
        },
        server: {
          id: this.serverConfig?.serverId || 'veloce-in-01',
          name: this.serverConfig?.serverName || 'Veloce India Edge Server',
          location: this.serverConfig?.serverLocation || 'India (Direct Network Socket)',
          clientIp: this.serverConfig?.clientIp || '127.0.0.1',
        },
        connection: connectionInfo,
      };

      this.callbacks.onComplete(finalResult);
    } catch (err: any) {
      if (signal.aborted) {
        return;
      }
      this.isRunning = false;
      this.callbacks.onStateChange('ERROR');
      this.callbacks.onError(err?.message || 'Network test failed. Please verify your connection.');
    }
  }

  /**
   * Real streaming download measurement
   */
  private async runDownloadMeasurement(
    signal: AbortSignal,
    onPoint: (pt: GraphPoint) => void
  ): Promise<{ averageMbps: number; peakMbps: number; totalBytes: number }> {
    const TARGET_DURATION_MS = 8000; // 8 seconds of active download test
    const startTime = performance.now();

    let totalBytesReceived = 0;
    let peakMbps = 0;
    let finalAvgMbps = 0;

    // Window tracking for instantaneous throughput
    interface Sample {
      time: number;
      bytes: number;
    }
    const sampleWindow: Sample[] = [];
    const WINDOW_SPAN_MS = 600; // 600ms moving window for smooth, accurate live speed

    // Progressively download streams
    // Start with 10MB chunk, if fast launch parallel or larger stream
    const requestedSize = 25 * 1024 * 1024; // 25 MB stream
    let isTestActive = true;

    const downloadStream = async (sizeBytes: number) => {
      const res = await fetch(`/api/download?size=${sizeBytes}&t=${Date.now()}`, {
        signal,
        cache: 'no-store',
      });

      if (!res.ok || !res.body) {
        throw new Error('Download test failed: Server rejected stream request.');
      }

      const reader = res.body.getReader();

      try {
        while (isTestActive && !signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            const now = performance.now();
            const chunkLen = value.length;
            totalBytesReceived += chunkLen;

            sampleWindow.push({ time: now, bytes: chunkLen });

            // Prune window samples older than WINDOW_SPAN_MS
            const windowCutoff = now - WINDOW_SPAN_MS;
            while (sampleWindow.length > 0 && sampleWindow[0].time < windowCutoff) {
              sampleWindow.shift();
            }

            // Calculate instantaneous Mbps over the window
            if (sampleWindow.length > 1) {
              const windowBytes = sampleWindow.reduce((acc, s) => acc + s.bytes, 0);
              const windowTimeSpanSec = (now - sampleWindow[0].time) / 1000;
              if (windowTimeSpanSec > 0.05) {
                const currentMbps = (windowBytes * 8) / (windowTimeSpanSec * 1000000);
                if (currentMbps > peakMbps) {
                  peakMbps = currentMbps;
                }

                const elapsedTotalSec = Math.max(0.1, (now - startTime) / 1000);
                const avgMbps = (totalBytesReceived * 8) / (elapsedTotalSec * 1000000);
                finalAvgMbps = avgMbps;

                const progress = Math.min(0.99, (now - startTime) / TARGET_DURATION_MS);

                this.callbacks.onDownloadUpdate({
                  timestamp: now,
                  currentMbps: Math.round(currentMbps * 100) / 100,
                  averageMbps: Math.round(avgMbps * 100) / 100,
                  peakMbps: Math.round(peakMbps * 100) / 100,
                  bytesTransferred: totalBytesReceived,
                  elapsedSeconds: Math.round(elapsedTotalSec * 10) / 10,
                  progress,
                });

                onPoint({
                  time: Math.round(elapsedTotalSec * 10) / 10,
                  speed: Math.round(currentMbps * 100) / 100,
                  stage: 'download',
                });
              }
            }

            // Stop if target duration has elapsed
            if (now - startTime >= TARGET_DURATION_MS) {
              isTestActive = false;
              break;
            }
          }
        }
      } finally {
        try {
          await reader.cancel();
        } catch {
          // stream already finished
        }
      }
    };

    // Run first download stream; if fast and still within time, run continuous streams until duration hits
    while (isTestActive && !signal.aborted && (performance.now() - startTime) < TARGET_DURATION_MS) {
      await downloadStream(requestedSize);
    }

    const totalElapsedSec = Math.max(0.1, (performance.now() - startTime) / 1000);
    const measuredAvgMbps = (totalBytesReceived * 8) / (totalElapsedSec * 1000000);

    return {
      averageMbps: measuredAvgMbps > 0 ? measuredAvgMbps : finalAvgMbps,
      peakMbps: Math.max(peakMbps, measuredAvgMbps),
      totalBytes: totalBytesReceived,
    };
  }

  /**
   * Real chunked binary upload measurement
   */
  private async runUploadMeasurement(
    signal: AbortSignal,
    onPoint: (pt: GraphPoint) => void
  ): Promise<{ averageMbps: number; peakMbps: number; totalBytes: number }> {
    const TARGET_DURATION_MS = 6000; // 6 seconds of upload
    const startTime = performance.now();

    // Allocate a single reusable 1 MB buffer filled with deterministic data
    // to avoid allocating hundreds of MBs in browser memory
    const CHUNK_SIZE = 1024 * 1024; // 1 MB
    const uploadChunk = new Uint8Array(CHUNK_SIZE);
    for (let i = 0; i < CHUNK_SIZE; i += 4) {
      uploadChunk[i] = (i * 37) & 0xff;
      uploadChunk[i + 1] = (i * 73) & 0xff;
      uploadChunk[i + 2] = (i * 101) & 0xff;
      uploadChunk[i + 3] = (i * 157) & 0xff;
    }

    let totalBytesUploaded = 0;
    let peakMbps = 0;
    let finalAvgMbps = 0;

    interface Sample {
      time: number;
      bytes: number;
    }
    const sampleWindow: Sample[] = [];
    const WINDOW_SPAN_MS = 600;

    while (!signal.aborted && (performance.now() - startTime) < TARGET_DURATION_MS) {
      const chunkStart = performance.now();

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadChunk,
        signal,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'no-store',
        },
      });

      if (!uploadRes.ok) {
        throw new Error('Upload test failed: Server rejected payload.');
      }

      const chunkEnd = performance.now();
      totalBytesUploaded += CHUNK_SIZE;

      sampleWindow.push({ time: chunkEnd, bytes: CHUNK_SIZE });

      // Prune window
      const windowCutoff = chunkEnd - WINDOW_SPAN_MS;
      while (sampleWindow.length > 0 && sampleWindow[0].time < windowCutoff) {
        sampleWindow.shift();
      }

      const chunkElapsedSec = (chunkEnd - chunkStart) / 1000;
      const chunkMbps = (CHUNK_SIZE * 8) / (chunkElapsedSec * 1000000);

      if (chunkMbps > peakMbps) {
        peakMbps = chunkMbps;
      }

      const totalElapsedSec = Math.max(0.1, (chunkEnd - startTime) / 1000);
      const avgMbps = (totalBytesUploaded * 8) / (totalElapsedSec * 1000000);
      finalAvgMbps = avgMbps;

      const progress = Math.min(0.99, (chunkEnd - startTime) / TARGET_DURATION_MS);

      this.callbacks.onUploadUpdate({
        timestamp: chunkEnd,
        currentMbps: Math.round(chunkMbps * 100) / 100,
        averageMbps: Math.round(avgMbps * 100) / 100,
        peakMbps: Math.round(peakMbps * 100) / 100,
        bytesTransferred: totalBytesUploaded,
        elapsedSeconds: Math.round(totalElapsedSec * 10) / 10,
        progress,
      });

      onPoint({
        time: Math.round(totalElapsedSec * 10) / 10,
        speed: Math.round(chunkMbps * 100) / 100,
        stage: 'upload',
      });
    }

    const totalElapsedSec = Math.max(0.1, (performance.now() - startTime) / 1000);
    const measuredAvgMbps = (totalBytesUploaded * 8) / (totalElapsedSec * 1000000);

    return {
      averageMbps: measuredAvgMbps > 0 ? measuredAvgMbps : finalAvgMbps,
      peakMbps: Math.max(peakMbps, measuredAvgMbps),
      totalBytes: totalBytesUploaded,
    };
  }
}
