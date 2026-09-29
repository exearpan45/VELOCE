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

/*
 * Progressive browser-only test:
 * small transfers establish a baseline, then larger transfers remove
 * TCP/TLS slow-start and request-overhead effects on fast connections.
 * The final bandwidth is p90 of valid request measurements, matching
 * the important part of Cloudflare's published methodology.
 */
const DOWNLOAD_PHASES = [
  { bytes: 100_000, count: 6 },
  { bytes: 1_000_000, count: 6 },
  { bytes: 10_000_000, count: 5 },
  { bytes: 25_000_000, count: 4 },
  { bytes: 100_000_000, count: 3 },
  { bytes: 250_000_000, count: 2 },
];

const UPLOAD_PHASES = [
  { bytes: 100_000, count: 6 },
  { bytes: 1_000_000, count: 6 },
  { bytes: 10_000_000, count: 5 },
  { bytes: 25_000_000, count: 4 },
  { bytes: 50_000_000, count: 3 },
  { bytes: 100_000_000, count: 2 },
];

const MIN_VALID_DURATION_MS = 10;
const PHASE_MAX_DURATION_MS = 12_000;
const MAX_PARALLEL = 8;

const p90 = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.9) - 1);
  return sorted[index];
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const getConcurrency = () => {
  const connection = (navigator as any).connection;
  const downlink = Number(connection?.downlink || 0);

  // More parallel requests help high-bandwidth links reach their
  // available throughput without forcing every user into 8 streams.
  if (downlink >= 2000) return MAX_PARALLEL;
  if (downlink >= 500) return 6;
  return 4;
};

const makeBuffer = (bytes: number) => {
  const buffer = new Uint8Array(bytes);
  if (bytes <= 65_536) {
    crypto.getRandomValues(buffer);
    return buffer;
  }

  // Fill in secure-random blocks to avoid the browser's getRandomValues
  // per-call limit on large payloads.
  const block = new Uint8Array(65_536);
  crypto.getRandomValues(block);
  for (let offset = 0; offset < bytes; offset += block.length) {
    buffer.set(block.subarray(0, Math.min(block.length, bytes - offset)), offset);
  }
  return buffer;
};

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
      maxDownloadBytes: DOWNLOAD_PHASES[DOWNLOAD_PHASES.length - 1].bytes,
      maxUploadBytes: UPLOAD_PHASES[UPLOAD_PHASES.length - 1].bytes,
      chunkSize: 0,
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

    try {
      this.callbacks.onStateChange('PREPARING');
      const prep = await fetch(`${TEST_BASE}/__down?bytes=0&cb=${Date.now()}`, {
        signal,
        cache: 'no-store',
        mode: 'cors',
      });
      if (!prep.ok) throw new Error('Cloudflare test edge is unavailable.');

      this.callbacks.onStateChange('PING_TEST');
      const pingSamples: number[] = [];

      for (let i = 0; i < 10; i++) {
        const started = performance.now();
        const response = await fetch(`${TEST_BASE}/__down?bytes=0&cb=${Date.now()}-${i}`, {
          signal,
          cache: 'no-store',
          mode: 'cors',
        });
        if (!response.ok) throw new Error('Latency endpoint is unavailable.');

        const rtt = Math.max(1, performance.now() - started);
        pingSamples.push(rtt);

        const sorted = [...pingSamples].sort((a, b) => a - b);
        const avg = pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length;
        const jitter = pingSamples.length > 1
          ? pingSamples.slice(1).reduce((sum, v, idx) => sum + Math.abs(v - pingSamples[idx]), 0) / (pingSamples.length - 1)
          : 0;

        this.callbacks.onPingUpdate({
          current: rtt,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg,
          median: median(pingSamples),
          jitter,
          samples: [...pingSamples],
          progress: (i + 1) / 10,
        });

        await this.sleep(60, signal);
      }

      this.callbacks.onStateChange('DOWNLOAD_TEST');
      const downloadResult = await this.measureDirection(
        'download',
        DOWNLOAD_PHASES,
        signal,
        (measurement) => this.callbacks.onDownloadUpdate(measurement),
        (point) => this.callbacks.onGraphPoint(point),
      );

      await this.sleep(250, signal);

      this.callbacks.onStateChange('UPLOAD_TEST');
      const uploadResult = await this.measureDirection(
        'upload',
        UPLOAD_PHASES,
        signal,
        (measurement) => this.callbacks.onUploadUpdate(measurement),
        (point) => this.callbacks.onGraphPoint(point),
      );

      const sortedPings = [...pingSamples].sort((a, b) => a - b);
      const pingAvg = pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length;
      const jitter = pingSamples.length > 1
        ? pingSamples.slice(1).reduce((sum, v, idx) => sum + Math.abs(v - pingSamples[idx]), 0) / (pingSamples.length - 1)
        : 0;

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
          median: Math.round(median(pingSamples) * 10) / 10,
          jitter: Math.round(jitter * 10) / 10,
        },
        download: {
          // p90 is intentionally exposed through the existing avgMbps field.
          avgMbps: Math.round(downloadResult.bandwidthMbps * 100) / 100,
          peakMbps: Math.round(downloadResult.peakMbps * 100) / 100,
          totalBytes: downloadResult.totalBytes,
        },
        upload: {
          avgMbps: Math.round(uploadResult.bandwidthMbps * 100) / 100,
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

  private async measureDirection(
    direction: 'download' | 'upload',
    phases: Array<{ bytes: number; count: number }>,
    signal: AbortSignal,
    onMeasurement: (measurement: SpeedMeasurement) => void,
    onPoint: (point: GraphPoint) => void,
  ) {
    const testStart = performance.now();
    let totalBytes = 0;
    let peakMbps = 0;
    const validSpeeds: number[] = [];
    const concurrency = getConcurrency();

    for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      const phase = phases[phaseIndex];
      const phaseStart = performance.now();
      const phaseSpeeds: number[] = [];
      let nextRequest = 0;

      const worker = async () => {
        while (!signal.aborted) {
          const requestIndex = nextRequest++;
          if (requestIndex >= phase.count) return;

          const started = performance.now();

          if (direction === 'download') {
            const response = await fetch(
              `${TEST_BASE}/__down?bytes=${phase.bytes}&cb=${Date.now()}-${phaseIndex}-${requestIndex}-${Math.random()}`,
              { signal, cache: 'no-store', mode: 'cors' },
            );
            if (!response.ok || !response.body) throw new Error('Download test endpoint is unavailable.');

            const reader = response.body.getReader();
            let requestBytes = 0;
            try {
              while (!signal.aborted) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) requestBytes += value.byteLength;
              }
            } finally {
              try { await reader.cancel(); } catch {}
            }

            const duration = performance.now() - started;
            if (requestBytes > 0) {
              totalBytes += requestBytes;
              const mbps = requestBytes * 8 / Math.max(1, duration) * 1000 / 1e6;
              if (duration >= MIN_VALID_DURATION_MS) validSpeeds.push(mbps);
              phaseSpeeds.push(mbps);
              peakMbps = Math.max(peakMbps, mbps);
            }
          } else {
            const body = makeBuffer(phase.bytes);
            const response = await fetch(`${TEST_BASE}/__up?cb=${Date.now()}-${phaseIndex}-${requestIndex}-${Math.random()}`, {
              method: 'POST',
              body,
              signal,
              cache: 'no-store',
              mode: 'cors',
              headers: { 'Content-Type': 'application/octet-stream' },
            });
            if (!response.ok) throw new Error('Upload test endpoint is unavailable.');

            const duration = performance.now() - started;
            totalBytes += phase.bytes;
            const mbps = phase.bytes * 8 / Math.max(1, duration) * 1000 / 1e6;
            if (duration >= MIN_VALID_DURATION_MS) validSpeeds.push(mbps);
            phaseSpeeds.push(mbps);
            peakMbps = Math.max(peakMbps, mbps);
          }

          const elapsed = Math.max(0.001, (performance.now() - testStart) / 1000);
          const averageMbps = totalBytes * 8 / elapsed / 1e6;

          onMeasurement({
            timestamp: performance.now(),
            currentMbps: phaseSpeeds[phaseSpeeds.length - 1] || 0,
            averageMbps: p90(validSpeeds),
            peakMbps,
            bytesTransferred: totalBytes,
            elapsedSeconds: elapsed,
            progress: Math.min(0.99, (phaseIndex + (requestIndex + 1) / phase.count) / phases.length),
          });

          onPoint({
            time: elapsed,
            speed: phaseSpeeds[phaseSpeeds.length - 1] || 0,
            stage: direction,
          });
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, phase.count) }, () => worker()),
      );

      // Don't spend excessive data/time on a phase that is already long enough.
      // A fast 1 Gbps–10 Gbps connection naturally advances to the large
      // payload phases; slower links can stop once requests are comfortably long.
      const phaseDuration = performance.now() - phaseStart;
      if (phaseDuration > PHASE_MAX_DURATION_MS) break;
    }

    const bandwidthMbps = p90(validSpeeds);
    return { bandwidthMbps, peakMbps, totalBytes };
  }
}
