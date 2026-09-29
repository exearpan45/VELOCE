import { PingMetrics, SpeedMeasurement, TestResult, ServerConfig, GraphPoint } from '../types/speedtest';

export interface SpeedTestCallbacks {
  onStateChange: (state: string) => void;
  onPingUpdate: (metrics: PingMetrics) => void;
  onDownloadUpdate: (measurement: SpeedMeasurement) => void;
  onUploadUpdate: (measurement: SpeedMeasurement) => void;
  onGraphPoint: (point: GraphPoint) => void;
  onComplete: (result: TestResult) => void;
  onError: (error: string) => void;
}

const TEST_BASE = 'https://speed.cloudflare.com';
const DOWNLOAD_BYTES = 10 * 1024 * 1024;
const DOWNLOAD_WORKERS = 4;
const UPLOAD_BYTES = 2 * 1024 * 1024;
const UPLOAD_WORKERS = 3;
const TEST_DURATION_MS = 7000;

export class SpeedTestEngine {
  private abortController: AbortController | null = null;
  private isRunning = false;
  private callbacks: SpeedTestCallbacks;
  private serverConfig: ServerConfig = {
    serverId: 'cloudflare-speed',
    serverName: 'Cloudflare Speed Test Edge',
    serverLocation: 'Cloudflare Anycast Edge',
    clientIp: 'Unavailable',
    limits: {
      maxDownloadBytes: DOWNLOAD_BYTES,
      maxUploadBytes: UPLOAD_BYTES,
      chunkSize: UPLOAD_BYTES,
    },
  };

  constructor(callbacks: SpeedTestCallbacks) {
    this.callbacks = callbacks;
  }

  public abort() {
    this.abortController?.abort();
    this.abortController = null;
    this.isRunning = false;
    this.callbacks.onStateChange('CANCELLED');
  }

  private sleep(ms: number, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, ms);
      signal.addEventListener('abort', () => {
        window.clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    });
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const testStartTime = performance.now();
    const graphPoints: GraphPoint[] = [];

    try {
      this.callbacks.onStateChange('PREPARING');
      await fetch(`${TEST_BASE}/cdn-cgi/trace?t=${Date.now()}`, {
        signal,
        cache: 'no-store',
        mode: 'cors',
      });
      await this.sleep(250, signal);

      this.callbacks.onStateChange('PING_TEST');
      const pingSamples: number[] = [];

      for (let i = 0; i < 8; i++) {
        const started = performance.now();
        const response = await fetch(`${TEST_BASE}/cdn-cgi/trace?t=${Date.now()}-${i}`, {
          signal,
          cache: 'no-store',
          mode: 'cors',
        });
        if (!response.ok) throw new Error('Ping endpoint is unavailable.');
        const rtt = Math.max(1, performance.now() - started);
        pingSamples.push(rtt);

        const sorted = [...pingSamples].sort((a, b) => a - b);
        const avg = pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length;
        const jitter = pingSamples.length > 1
          ? pingSamples.slice(1).reduce((sum, v, idx) => sum + Math.abs(v - pingSamples[idx]), 0) / (pingSamples.length - 1)
          : 0;
        const median = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

        this.callbacks.onPingUpdate({
          current: rtt,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg,
          median,
          jitter,
          samples: [...pingSamples],
          progress: (i + 1) / 8,
        });
        await this.sleep(70, signal);
      }

      this.callbacks.onStateChange('DOWNLOAD_TEST');
      const downloadResult = await this.measureDownload(signal, (point) => {
        graphPoints.push(point);
        this.callbacks.onGraphPoint(point);
      });

      await this.sleep(250, signal);

      this.callbacks.onStateChange('UPLOAD_TEST');
      const uploadResult = await this.measureUpload(signal, (point) => {
        graphPoints.push(point);
        this.callbacks.onGraphPoint(point);
      });

      const sortedPings = [...pingSamples].sort((a, b) => a - b);
      const pingAvg = pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length;
      const jitter = pingSamples.length > 1
        ? pingSamples.slice(1).reduce((sum, v, idx) => sum + Math.abs(v - pingSamples[idx]), 0) / (pingSamples.length - 1)
        : 0;
      const median = sortedPings.length % 2
        ? sortedPings[Math.floor(sortedPings.length / 2)]
        : (sortedPings[sortedPings.length / 2 - 1] + sortedPings[sortedPings.length / 2]) / 2;

      const navConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const connectionInfo = {
        effectiveType: navConn?.effectiveType,
        downlink: navConn?.downlink,
        rtt: navConn?.rtt,
        saveData: navConn?.saveData || false,
        online: navigator.onLine,
      };

      this.callbacks.onStateChange('COMPLETED');
      this.isRunning = false;

      this.callbacks.onComplete({
        id: 'test-' + Date.now().toString(36),
        timestamp: Date.now(),
        dateString: new Date().toLocaleString(),
        durationSeconds: Math.round(((performance.now() - testStartTime) / 1000) * 10) / 10,
        ping: {
          avg: Math.round(pingAvg * 10) / 10,
          min: Math.round(sortedPings[0] * 10) / 10,
          max: Math.round(sortedPings[sortedPings.length - 1] * 10) / 10,
          median: Math.round(median * 10) / 10,
          jitter: Math.round(jitter * 10) / 10,
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
          id: this.serverConfig.serverId,
          name: this.serverConfig.serverName,
          location: this.serverConfig.serverLocation,
          clientIp: 'Unavailable',
        },
        connection: connectionInfo,
      });
    } catch (error: any) {
      if (signal.aborted || error?.name === 'AbortError') return;
      this.isRunning = false;
      this.callbacks.onStateChange('ERROR');
      this.callbacks.onError(error?.message || 'Network test failed. Please check your connection.');
    }
  }

  private async measureDownload(signal: AbortSignal, onPoint: (point: GraphPoint) => void) {
    const start = performance.now();
    let totalBytes = 0;
    let peakMbps = 0;
    let lastSampleTime = start;
    let lastSampleBytes = 0;

    const sample = (now: number) => {
      const elapsed = Math.max(0.05, (now - start) / 1000);
      const deltaTime = Math.max(0.05, (now - lastSampleTime) / 1000);
      const deltaBytes = totalBytes - lastSampleBytes;
      const currentMbps = deltaBytes * 8 / deltaTime / 1e6;
      const averageMbps = totalBytes * 8 / elapsed / 1e6;
      peakMbps = Math.max(peakMbps, currentMbps);
      lastSampleTime = now;
      lastSampleBytes = totalBytes;
      this.callbacks.onDownloadUpdate({
        timestamp: now,
        currentMbps,
        averageMbps,
        peakMbps,
        bytesTransferred: totalBytes,
        elapsedSeconds: elapsed,
        progress: Math.min(0.99, elapsed / (TEST_DURATION_MS / 1000)),
      });
      onPoint({ time: elapsed, speed: currentMbps, stage: 'download' });
    };

    const worker = async () => {
      while (!signal.aborted && performance.now() - start < TEST_DURATION_MS) {
        const response = await fetch(`${TEST_BASE}/__down?bytes=${DOWNLOAD_BYTES}&cacheBust=${Date.now()}-${Math.random()}`, {
          signal,
          cache: 'no-store',
          mode: 'cors',
        });
        if (!response.ok || !response.body) throw new Error('Download test endpoint is unavailable.');
        const reader = response.body.getReader();
        try {
          while (!signal.aborted && performance.now() - start < TEST_DURATION_MS) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              totalBytes += value.byteLength;
              const now = performance.now();
              if (now - lastSampleTime >= 200) sample(now);
            }
          }
        } finally {
          try { await reader.cancel(); } catch {}
        }
      }
    };

    await Promise.all(Array.from({ length: DOWNLOAD_WORKERS }, () => worker()));
    sample(performance.now());

    return {
      averageMbps: totalBytes * 8 / Math.max(0.1, (performance.now() - start)) * 1000 / 1e6,
      peakMbps,
      totalBytes,
    };
  }

  private async measureUpload(signal: AbortSignal, onPoint: (point: GraphPoint) => void) {
    const start = performance.now();
    let totalBytes = 0;
    let peakMbps = 0;
    let lastSampleTime = start;
    let lastSampleBytes = 0;
    const body = new Uint8Array(UPLOAD_BYTES);
    crypto.getRandomValues(body);

    const sample = (now: number) => {
      const elapsed = Math.max(0.05, (now - start) / 1000);
      const deltaTime = Math.max(0.05, (now - lastSampleTime) / 1000);
      const deltaBytes = totalBytes - lastSampleBytes;
      const currentMbps = deltaBytes * 8 / deltaTime / 1e6;
      const averageMbps = totalBytes * 8 / elapsed / 1e6;
      peakMbps = Math.max(peakMbps, currentMbps);
      lastSampleTime = now;
      lastSampleBytes = totalBytes;
      this.callbacks.onUploadUpdate({
        timestamp: now,
        currentMbps,
        averageMbps,
        peakMbps,
        bytesTransferred: totalBytes,
        elapsedSeconds: elapsed,
        progress: Math.min(0.99, elapsed / (TEST_DURATION_MS / 1000)),
      });
      onPoint({ time: elapsed, speed: currentMbps, stage: 'upload' });
    };

    const worker = async () => {
      while (!signal.aborted && performance.now() - start < TEST_DURATION_MS) {
        const response = await fetch(`${TEST_BASE}/__up`, {
          method: 'POST',
          body,
          signal,
          cache: 'no-store',
          mode: 'cors',
          headers: { 'Content-Type': 'application/octet-stream' },
        });
        if (!response.ok) throw new Error('Upload test endpoint is unavailable.');
        totalBytes += UPLOAD_BYTES;
        const now = performance.now();
        if (now - lastSampleTime >= 200) sample(now);
      }
    };

    await Promise.all(Array.from({ length: UPLOAD_WORKERS }, () => worker()));
    sample(performance.now());

    const elapsed = Math.max(0.1, (performance.now() - start) / 1000);
    return { averageMbps: totalBytes * 8 / elapsed / 1e6, peakMbps, totalBytes };
  }
}
