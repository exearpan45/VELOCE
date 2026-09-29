import React, { useMemo } from 'react';
import { TestState } from '../types/speedtest';

interface SpeedGaugeProps {
  value: number; // Current measured Mbps or ms
  state: TestState;
  unit?: string;
  stageLabel?: string;
  peakValue?: number;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  value,
  state,
  unit = 'Mbps',
  stageLabel,
  peakValue = 0,
}) => {
  // Determine dynamic maximum scale based on highest value
  const maxScale = useMemo(() => {
    const highest = Math.max(value, peakValue);
    if (highest <= 30) return 50;
    if (highest <= 75) return 100;
    if (highest <= 200) return 250;
    if (highest <= 450) return 500;
    return 1000;
  }, [value, peakValue]);

  // Radius and geometry
  const radius = 118;
  const strokeWidth = 14;
  const center = 150;

  // Arc angles (260 degrees total arc: 140° to 400°)
  const arcLength = 2 * Math.PI * radius * (260 / 360);
  const ratio = Math.min(1, Math.max(0, value / maxScale));
  const dashOffset = arcLength * (1 - ratio);

  // Tick markers
  const ticks = useMemo(() => {
    const count = 5;
    const items = [];
    for (let i = 0; i <= count; i++) {
      const tickVal = Math.round((maxScale / count) * i);
      const tickRatio = i / count;
      const angleDeg = 140 + tickRatio * 260;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x1 = center + (radius - 12) * Math.cos(angleRad);
      const y1 = center + (radius - 12) * Math.sin(angleRad);
      const x2 = center + (radius - 22) * Math.cos(angleRad);
      const y2 = center + (radius - 22) * Math.sin(angleRad);
      const textX = center + (radius - 34) * Math.cos(angleRad);
      const textY = center + (radius - 34) * Math.sin(angleRad) + 3;

      items.push({
        val: tickVal,
        x1,
        y1,
        x2,
        y2,
        textX,
        textY,
      });
    }
    return items;
  }, [maxScale]);

  // Color theme according to current stage
  const themeColor = useMemo(() => {
    switch (state) {
      case 'PING_TEST':
        return {
          stroke: '#38bdf8', // Sky
          glow: 'rgba(56, 189, 248, 0.4)',
          text: 'text-sky-400',
        };
      case 'DOWNLOAD_TEST':
        return {
          stroke: '#06b6d4', // Cyan
          glow: 'rgba(6, 182, 212, 0.45)',
          text: 'text-cyan-400',
        };
      case 'UPLOAD_TEST':
        return {
          stroke: '#8b5cf6', // Violet
          glow: 'rgba(139, 92, 246, 0.45)',
          text: 'text-violet-400',
        };
      case 'COMPLETED':
        return {
          stroke: '#10b981', // Emerald
          glow: 'rgba(16, 185, 129, 0.4)',
          text: 'text-emerald-400',
        };
      case 'ERROR':
        return {
          stroke: '#f43f5e', // Rose
          glow: 'rgba(244, 63, 94, 0.4)',
          text: 'text-rose-400',
        };
      default:
        return {
          stroke: '#64748b', // Slate
          glow: 'rgba(100, 116, 139, 0.2)',
          text: 'text-slate-400',
        };
    }
  }, [state]);

  const displayStateLabel = useMemo(() => {
    if (stageLabel) return stageLabel;
    switch (state) {
      case 'PREPARING':
        return 'PREPARING TEST';
      case 'PING_TEST':
        return 'LATENCY TEST';
      case 'DOWNLOAD_TEST':
        return 'DOWNLOAD MEASUREMENT';
      case 'UPLOAD_TEST':
        return 'UPLOAD MEASUREMENT';
      case 'COMPLETED':
        return 'TEST COMPLETED';
      case 'CANCELLED':
        return 'TEST STOPPED';
      case 'ERROR':
        return 'TEST FAILED';
      default:
        return 'READY';
    }
  }, [state, stageLabel]);

  // Semicircular SVG Path
  const startAngleRad = (140 * Math.PI) / 180;
  const endAngleRad = (400 * Math.PI) / 180;
  const startX = center + radius * Math.cos(startAngleRad);
  const startY = center + radius * Math.sin(startAngleRad);
  const endX = center + radius * Math.cos(endAngleRad);
  const endY = center + radius * Math.sin(endAngleRad);

  // SVG arc path (large-arc-flag: 1 because 260° > 180°)
  const pathD = `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`;

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none"
      role="meter"
      aria-label="Speed Measurement Gauge"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={maxScale}
      aria-valuetext={`${value} ${unit}`}
    >
      <div className="relative w-72 h-72 sm:w-84 sm:h-84 flex items-center justify-center">
        {/* Subtle background glow circle */}
        <div
          className="absolute inset-4 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500"
          style={{ backgroundColor: themeColor.stroke }}
        />

        <svg
          viewBox="0 0 300 300"
          className="w-full h-full transform -rotate-10 origin-center overflow-visible"
        >
          <defs>
            {/* Gradient definition for active arc */}
            <linearGradient id="gaugeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor={themeColor.stroke} />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={themeColor.stroke} floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Track background */}
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Ticks and scale labels */}
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                className="stroke-slate-400 dark:stroke-slate-600"
                strokeWidth="1.5"
                opacity="0.8"
              />
              <text
                x={t.textX}
                y={t.textY}
                fontSize="10"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="600"
                textAnchor="middle"
                className="transform rotate-10 origin-center fill-slate-600 dark:fill-slate-400"
              >
                {t.val}
              </text>
            </g>
          ))}

          {/* Active measurement progress arc */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={dashOffset}
            filter="url(#gaugeGlow)"
            className="transition-[stroke-dashoffset] duration-150 ease-out"
          />
        </svg>

        {/* Center Display Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none pt-4">
          {/* Stage indicator banner */}
          <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
            {state !== 'IDLE' && state !== 'COMPLETED' && state !== 'CANCELLED' && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
            )}
            <span>{displayStateLabel}</span>
          </div>

          {/* Live Metric Number */}
          <div className="flex items-baseline justify-center tracking-tight font-extrabold text-slate-900 dark:text-white">
            <span className="text-5xl sm:text-6xl tabular-nums leading-none font-mono">
              {state === 'IDLE' ? '0.0' : value.toFixed(value < 10 && value > 0 ? 2 : 1)}
            </span>
          </div>

          {/* Unit */}
          <div className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-semibold mt-1">
            {state === 'PING_TEST' ? 'ms latency' : unit}
          </div>

          {/* Peak throughput indicator if active */}
          {peakValue > 0 && (state === 'DOWNLOAD_TEST' || state === 'UPLOAD_TEST') && (
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-1 font-medium">
              Peak: {peakValue.toFixed(1)} Mbps
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
