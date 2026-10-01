import React, { useEffect, useRef } from 'react';
import { GraphPoint } from '../types/speedtest';

interface LiveGraphProps {
  points: GraphPoint[];
  currentStage: string;
  darkMode?: boolean;
}

export const LiveGraph: React.FC<LiveGraphProps> = ({ points, currentStage, darkMode = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Draw background grid lines based on theme
    ctx.strokeStyle = darkMode ? '#1e293b' : '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    const gridLines = 3;
    for (let i = 1; i <= gridLines; i++) {
      const y = (height / (gridLines + 1)) * i;
      ctx.beginPath();
      ctx.moveTo(32, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    if (points.length < 2) {
      // Empty placeholder state
      ctx.fillStyle = darkMode ? '#94a3b8' : '#64748b';
      ctx.font = '11px monospace';
      const label = width < 380 ? 'Live throughput waveform' : 'Real-time throughput waveform';
      ctx.fillText(label, 40, height / 2 + 4);
      ctx.restore();
      return;
    }

    // Determine scale limits
    const maxSpeed = Math.max(...points.map((p) => p.speed), 10);
    const maxY = Math.ceil(maxSpeed * 1.15); // Add 15% headroom
    const paddingLeft = 32;
    const paddingBottom = 20;
    const graphWidth = width - paddingLeft - 10;
    const graphHeight = height - paddingBottom - 10;

    // Y-axis labels
    ctx.fillStyle = darkMode ? '#94a3b8' : '#475569';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${maxY}M`, paddingLeft - 6, 12);
    ctx.fillText(`${Math.round(maxY / 2)}M`, paddingLeft - 6, graphHeight / 2 + 4);
    ctx.fillText('0', paddingLeft - 6, graphHeight + 10);

    // Group points by stage (download vs upload)
    const downloadPoints = points.filter((p) => p.stage === 'download');
    const uploadPoints = points.filter((p) => p.stage === 'upload');

    const renderLine = (pts: GraphPoint[], strokeColor: string, fillColor: string) => {
      if (pts.length < 1) return;

      const totalTimeSpan = Math.max(...pts.map((p) => p.time), 1);

      ctx.beginPath();
      pts.forEach((pt, index) => {
        const x = paddingLeft + (pt.time / totalTimeSpan) * graphWidth;
        const y = 10 + graphHeight - (pt.speed / maxY) * graphHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Subtle gradient fill under curve
      const lastPt = pts[pts.length - 1];
      const firstPt = pts[0];
      const firstX = paddingLeft + (firstPt.time / totalTimeSpan) * graphWidth;
      const lastX = paddingLeft + (lastPt.time / totalTimeSpan) * graphWidth;
      const bottomY = 10 + graphHeight;

      ctx.lineTo(lastX, bottomY);
      ctx.lineTo(firstX, bottomY);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 10, 0, bottomY);
      gradient.addColorStop(0, fillColor);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fill();
    };

    if (downloadPoints.length > 0) {
      renderLine(downloadPoints, '#0891b2', darkMode ? 'rgba(6, 182, 212, 0.2)' : 'rgba(8, 145, 178, 0.15)');
    }

    if (uploadPoints.length > 0) {
      renderLine(uploadPoints, '#7c3aed', darkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(124, 58, 237, 0.15)');
    }

    ctx.restore();
  }, [points, currentStage, darkMode]);

  return (
    <div className="w-full bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm transition-colors duration-200">
      <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 mb-2 font-mono">
        <span className="uppercase tracking-wider font-semibold">Live Measurement Waveform</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 dark:bg-cyan-400 inline-block" />
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Download</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600 dark:bg-violet-400 inline-block" />
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Upload</span>
          </div>
        </div>
      </div>
      <div className="w-full h-28 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};
