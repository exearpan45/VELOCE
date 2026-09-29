import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// In-memory rate limiting for API endpoints (protects against abuse)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 300; // ample for 10-ping bursts and multiple chunk downloads

const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment before running another test.' });
    return;
  }

  record.count += 1;
  next();
};

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

// Pre-allocate a 256 KB non-compressible pseudo-random buffer to prevent compression proxies
// from skewing actual physical network throughput measurements.
const CHUNK_SIZE = 256 * 1024; // 256 KB
const CHUNK_BUFFER = Buffer.alloc(CHUNK_SIZE);
for (let i = 0; i < CHUNK_SIZE; i++) {
  // LCG pseudo-random generation for incompressible entropy
  CHUNK_BUFFER[i] = ((i * 1664525 + 1013904223) ^ (i >> 8)) & 0xff;
}

// -------------------------------------------------------------
// Speed Test Endpoints
// -------------------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({
    status: 'healthy',
    uptime: Math.round(process.uptime()),
    timestamp: Date.now(),
  });
});

// 2. Ping / Latency endpoint: minimal overhead, instantaneous 204 response
app.get('/api/ping', rateLimiter, (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Connection', 'keep-alive');
  res.status(204).end();
});

// 3. Server Configuration & Client Info
app.get('/api/config', rateLimiter, (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({
    serverId: 'veloce-in-01',
    serverName: 'Veloce India Edge Server',
    serverLocation: 'India (Direct Network Socket)',
    clientIp: clientIp.replace('::ffff:', ''),
    limits: {
      maxDownloadBytes: 104857600, // 100 MB
      maxUploadBytes: 52428800,    // 50 MB
      chunkSize: CHUNK_SIZE,
    },
  });
});

// 4. Download endpoint: streams exact binary bytes without caching
app.get('/api/download', rateLimiter, async (req, res) => {
  let requestedBytes = parseInt(req.query.size as string, 10);
  if (isNaN(requestedBytes) || requestedBytes <= 0) {
    requestedBytes = 10 * 1024 * 1024; // Default 10 MB
  }

  // Cap between 64 KB and 100 MB
  const totalBytes = Math.min(Math.max(requestedBytes, 64 * 1024), 104857600);

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', totalBytes.toString());
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Disposition', 'inline; filename="speedtest.bin"');

  let bytesSent = 0;
  let aborted = false;

  req.on('close', () => {
    aborted = true;
  });

  try {
    while (bytesSent < totalBytes && !aborted) {
      const remaining = totalBytes - bytesSent;
      const sendSize = Math.min(CHUNK_SIZE, remaining);
      const bufferSlice = sendSize === CHUNK_SIZE ? CHUNK_BUFFER : CHUNK_BUFFER.subarray(0, sendSize);

      const canContinue = res.write(bufferSlice);
      bytesSent += sendSize;

      if (!canContinue && !aborted) {
        await new Promise((resolve) => res.once('drain', resolve));
      }
    }

    if (!aborted) {
      res.end();
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).end();
    }
  }
});

// 5. Upload endpoint: drains incoming binary stream without holding in memory
app.post('/api/upload', rateLimiter, (req, res) => {
  const MAX_UPLOAD_BYTES = 52428800; // 50 MB limit
  let bytesReceived = 0;
  const startTime = performance.now();

  req.on('data', (chunk: Buffer) => {
    bytesReceived += chunk.length;
    if (bytesReceived > MAX_UPLOAD_BYTES) {
      req.destroy(new Error('Payload size exceeds maximum allowed upload limit (50MB).'));
    }
  });

  req.on('end', () => {
    const elapsedMs = performance.now() - startTime;
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.json({
      status: 'ok',
      bytesReceived,
      elapsedMs: Math.round(elapsedMs * 100) / 100,
    });
  });

  req.on('error', (err: any) => {
    if (!res.headersSent) {
      res.status(400).json({ error: err?.message || 'Upload error occurred' });
    }
  });
});

// -------------------------------------------------------------
// Vite Dev Server or Production Static Serving
// -------------------------------------------------------------
async function bootstrap() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build dist folder not found. Please run npm run build first.');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Veloce Speed Test server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
