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
    const TARGET_DURATION_MS = 8000;
    const startTime = performance.now();
    const STREAM_SIZE = 50 * 1024 * 1024;
    const WORKERS = 4;

    let totalBytesReceived = 0;
    let peakMbps = 0;
    let lastSampleTime = startTime;
    let lastSampleBytes = 0;
    let activeWorkers = WORKERS;

    const emitSample = (now: number) => {
      const elapsedSec = Math.max(0.05, (now - startTime) / 1000);
      const deltaSec = Math.max(0.05, (now - lastSampleTime) / 1000);
      const deltaBytes = totalBytesReceived - lastSampleBytes;
      const currentMbps = (deltaBytes * 8) / (deltaSec * 1000000);
      const averageMbps = (totalBytesReceived * 8) / (elapsedSec * 1000000);

      lastSampleTime = now;
      lastSampleBytes = totalBytesReceived;
      peakMbps = Math.max(peakMbps, currentMbps);

      this.callbacks.onDownloadUpdate({
        timestamp: now,
        currentMbps: Math.round(currentMbps * 100) / 100,
        averageMbps: Math.round(averageMbps * 100) / 100,
        peakMbps: Math.round(peakMbps * 100) / 100,
        bytesTransferred: totalBytesReceived,
        elapsedSeconds: Math.round(elapsedSec * 10) / 10,
        progress: Math.min(0.99, elapsedSec / (TARGET_DURATION_MS / 1000)),
      });

      onPoint({
        time: Math.round(elapsedSec * 10) / 10,
        speed: Math.round(currentMbps * 100) / 100,
        stage: 'download',
      });
    };

    const worker = async () => {
      try {
        while (!signal.aborted && performance.now() - startTime < TARGET_DURATION_MS) {
          const res = await fetch(`/api/download?size=${STREAM_SIZE}&t=${Date.now()}-${Math.random().toString(36).slice(2)}`, {
            signal,
            cache: 'no-store',
          });

          if (!res.ok || !res.body) {
            throw new Error('Download test failed: Server rejected stream request.');
          }

          const reader = res.body.getReader();
          try {
            while (!signal.aborted && performance.now() - startTime < TARGET_DURATION_MS) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                totalBytesReceived += value.byteLength;
                const now = performance.now();
                if (now - lastSampleTime >= 200) emitSample(now);
              }
            }
          } finally {
            try { await reader.cancel(); } catch {}
          }
        }
      } finally {
        activeWorkers -= 1;
      }
    };

    await Promise.all(Array.from({ length: WORKERS }, () => worker()));

    const totalElapsedSec = Math.max(0.1, (performance.now() - startTime) / 1000);
    const measuredAvgMbps = (totalBytesReceived * 8) / (totalElapsedSec * 1000000);

    if (totalBytesReceived > lastSampleBytes) {
      emitSample(performance.now());
    }

    return {
      averageMbps: measuredAvgMbps,
      peakMbps: Math.max(peakMbps, measuredAvgMbps),
      totalBytes: totalBytesReceived,
    };
  }

  private async runUploadMeasurement(
    signal: AbortSignal,
    onPoint: (pt: GraphPoint) => void
  ): Promise<{ averageMbps: number; peakMbps: number; totalBytes: number }> {
    const TARGET_DURATION_MS = 6000;
    const startTime = performance.now();
    const CHUNK_SIZE = 4 * 1024 * 1024;
    const WORKERS = 4;
    const uploadChunk = new Uint8Array(CHUNK_SIZE);

    for (let i = 0; i < uploadChunk.length; i += 4) {
      uploadChunk[i] = (i * 37) & 0xff;
      uploadChunk[i + 1] = (i * 73) & 0xff;
      uploadChunk[i + 2] = (i * 101) & 0xff;
      uploadChunk[i + 3] = (i * 157) & 0xff;
    }

    let totalBytesUploaded = 0;
    let peakMbps = 0;
    let lastSampleTime = startTime;
    let lastSampleBytes = 0;

    const emitSample = (now: number) => {
      const elapsedSec = Math.max(0.05, (now - startTime) / 1000);
      const deltaSec = Math.max(0.05, (now - lastSampleTime) / 1000);
      const deltaBytes = totalBytesUploaded - lastSampleBytes;
      const currentMbps = (deltaBytes * 8) / (deltaSec * 1000000);
      const averageMbps = (totalBytesUploaded * 8) / (elapsedSec * 1000000);

      lastSampleTime = now;
      lastSampleBytes = totalBytesUploaded;
      peakMbps = Math.max(peakMbps, currentMbps);

      this.callbacks.onUploadUpdate({
        timestamp: now,
        currentMbps: Math.round(currentMbps * 100) / 100,
        averageMbps: Math.round(averageMbps * 100) / 100,
        peakMbps: Math.round(peakMbps * 100) / 100,
        bytesTransferred: totalBytesUploaded,
        elapsedSeconds: Math.round(elapsedSec * 10) / 10,
        progress: Math.min(0.99, elapsedSec / (TARGET_DURATION_MS / 1000)),
      });

      onPoint({
        time: Math.round(elapsedSec * 10) / 10,
        speed: Math.round(currentMbps * 100) / 100,
        stage: 'upload',
      });
    };

    const worker = async () => {
      while (!signal.aborted && performance.now() - startTime < TARGET_DURATION_MS) {
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

        totalBytesUploaded += CHUNK_SIZE;
        const now = performance.now();
        if (now - lastSampleTime >= 200) {
          emitSample(now);
        }

        // Keep timing based on completed network transfers, not UI update frequency.
        void chunkStart;
      }
    };

    await Promise.all(Array.from({ length: WORKERS }, () => worker()));

    const totalElapsedSec = Math.max(0.1, (performance.now() - startTime) / 1000);
    const measuredAvgMbps = (totalBytesUploaded * 8) / (totalElapsedSec * 1000000);

    if (totalBytesUploaded > lastSampleBytes) {
      emitSample(performance.now());
    }

    return {
      averageMbps: measuredAvgMbps,
      peakMbps: Math.max(peakMbps, measuredAvgMbps),
      totalBytes: totalBytesUploaded,
    };
  }}
