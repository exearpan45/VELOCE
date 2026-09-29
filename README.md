# Veloce Speed Test — Premium Internet Speed Tester

Veloce is a production-grade, ultra-lightweight, full-stack internet broadband speed tester. It performs real physical network measurements—download throughput, upload throughput, ping latency, and jitter—without synthetic animations or fake numbers.

---

## 🚀 Key Features

* **True Network Measurements**: All numbers originate from actual byte transfers across network sockets.
* **Low-End Hardware Optimized**: Zero bloated charting libraries. Uses native SVG arcs and lightweight HTML5 Canvas for graphing.
* **RFC 3550 Jitter Calculation**: Measures successive packet delay variation across multiple round-trips.
* **Non-Compressible Payloads**: Test streams utilize high-entropy pseudo-random bytes to prevent proxy and router compression from skewing real throughput.
* **Responsive & Mobile-First**: Tested across 320px to 1920px viewports with zero horizontal overflow.
* **Immediate Test Cancellation**: "STOP TEST" instantly aborts active fetch readers, socket connections, and timers with zero orphaned requests.
* **AdSense & SEO Ready**: Includes OpenGraph, Twitter Cards, Schema.org `WebApplication` structured data, `robots.txt`, `sitemap.xml`, and non-intrusive reserved ad containers (zero CLS).
* **Privacy Focused**: No login, no telemetry cookies, no tracking scripts, and no persistent IP logging.

---

## 🏗️ Architecture

```
├── /public
│   ├── robots.txt         # SEO crawler rules
│   └── sitemap.xml        # SEO sitemap
├── /src
│   ├── components/        # Gauge, Waveform Graph, Metrics, Diagnostics, Educational & AdSlots
│   ├── types/             # Strict TypeScript models for measurements
│   ├── utils/             # Speed engine with AbortController and ReadableStream
│   ├── App.tsx            # State machine and view orchestration
│   ├── main.tsx           # React entry point
│   └── index.css          # Tailwind CSS
├── server.ts              # Express backend with raw streaming endpoints
└── package.json           # Scripts and dependencies
```

### Backend Endpoints

* `GET /api/health`: Health probe reporting uptime and status.
* `GET /api/ping`: Ultra-low overhead 204 response with `no-store` headers for microsecond round-trip timing.
* `GET /api/config`: Server location, client IP detection, and payload constraints.
* `GET /api/download?size=...`: Asynchronous backpressure-safe binary streaming up to 100 MB.
* `POST /api/upload`: Streaming binary upload sink with byte tracking and 50 MB hard abuse limits.

---

## 💻 Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the full-stack development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Verify type safety and linting:**
   ```bash
   npm run lint
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Run production server:**
   ```bash
   npm run start
   ```

---

## 🌐 Production Deployment

### Cloud Run / Docker / VPS
Set environment variables:
* `PORT=3000`
* `NODE_ENV=production`

Run:
```bash
npm run build
npm run start
```

### Static Frontend (e.g. Cloudflare Pages) + Dedicated Backend
1. Build the frontend: `npm run build` (outputs to `/dist`).
2. Deploy the Express API from `server.ts` to any Node.js hosting platform (Cloud Run, Fly.io, Railway, or Render).
3. Set proxy rule or `VITE_API_URL` to route `/api/*` to your backend instance.

---

## 🔒 Security & Performance

* In-memory sliding window rate limiting prevents API abuse.
* Reusable static buffers eliminate garbage collection spikes and high memory allocations in the browser.
* Clean AbortController integration prevents leaked sockets upon tab close or test stop.
