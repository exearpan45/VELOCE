export type TestState =
  | 'IDLE'
  | 'PREPARING'
  | 'PING_TEST'
  | 'DOWNLOAD_TEST'
  | 'UPLOAD_TEST'
  | 'COMPLETED'
  | 'ERROR'
  | 'CANCELLED';

export interface PingMetrics {
  current: number; // ms
  min: number;
  max: number;
  avg: number;
  median: number;
  jitter: number;
  samples: number[];
  progress: number; // 0 to 1
}

export interface SpeedMeasurement {
  timestamp: number; // ms
  currentMbps: number;
  averageMbps: number;
  peakMbps: number;
  bytesTransferred: number;
  elapsedSeconds: number;
  progress: number; // 0 to 1
}

export interface TestResult {
  id: string;
  timestamp: number;
  dateString: string;
  durationSeconds: number;
  ping: {
    avg: number;
    min: number;
    max: number;
    median: number;
    jitter: number;
  };
  download: {
    avgMbps: number;
    peakMbps: number;
    totalBytes: number;
  };
  upload: {
    avgMbps: number;
    peakMbps: number;
    totalBytes: number;
  };
  server: {
    id: string;
    name: string;
    location: string;
    clientIp: string;
  };
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
    online: boolean;
  };
}

export interface ServerConfig {
  serverId: string;
  serverName: string;
  serverLocation: string;
  clientIp: string;
  limits: {
    maxDownloadBytes: number;
    maxUploadBytes: number;
    chunkSize: number;
  };
}

export interface GraphPoint {
  time: number; // seconds from start of stage
  speed: number; // Mbps
  stage: 'download' | 'upload';
}
