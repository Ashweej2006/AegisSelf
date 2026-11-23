import React, { useState } from 'react';
import type { DailyTelemetryPoint } from '../types/vault';

type MetricMode = 'hrv' | 'sleep' | 'glucose' | 'anomaly';
type TimeframeDays = 7 | 14 | 30;

interface UnifiedTelemetryChartProps {
  telemetry: DailyTelemetryPoint[];
}

const METRIC_META: Record<
  MetricMode,
  {
    label: string;
    unit: string;
    color: string;
    secondaryLabel: string;
    getValue: (p: DailyTelemetryPoint) => number;
    getSecondary: (p: DailyTelemetryPoint) => number;
    secondaryUnit: string;
    baselineText: string;
  }
> = {
  hrv: {
    label: 'Nocturnal HRV',
    unit: 'ms',
    color: '#06B6D4',
    secondaryLabel: 'Recovery Index',
    getValue: (p) => p.hrvMs,
    getSecondary: (p) => p.recoveryIndex,
    secondaryUnit: '/100',
    baselineText: 'Personal baseline corridor: 64–76 ms',
  },
  sleep: {
    label: 'Deep Sleep Architecture',
    unit: 'hrs',
    color: '#0F172A',
    secondaryLabel: 'Resting HR',
    getValue: (p) => p.deepSleepHrs,
    getSecondary: (p) => p.rhrBpm,
    secondaryUnit: 'bpm',
    baselineText: 'Restorative floor: >= 1.65 hrs/night',
  },
  glucose: {
    label: 'Mean Interstitial Glucose',
    unit: 'mg/dL',
    color: '#006C49',
    secondaryLabel: 'Anomaly Index',
    getValue: (p) => p.glucoseMgDl,
    getSecondary: (p) => p.anomalyScore,
    secondaryUnit: '%',
    baselineText: 'Optimal fasting envelope: 84–96 mg/dL',
  },
  anomaly: {
    label: 'Cross-Source Anomaly Signal',
    unit: '%',
    color: '#BA1A1A',
    secondaryLabel: 'Nocturnal HRV',
    getValue: (p) => p.anomalyScore,
    getSecondary: (p) => p.hrvMs,
    secondaryUnit: 'ms',
    baselineText: 'Equilibrium threshold: <= 28% deviation',
  },
};

export const UnifiedTelemetryChart: React.FC<UnifiedTelemetryChartProps> = ({
  telemetry,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeDays>(14);
  const [metric, setMetric] = useState<MetricMode>('hrv');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const slice = telemetry.slice(-timeframe);
  const meta = METRIC_META[metric];

  const width = 760;
  const height = 248;
  const padLeft = 44;
  const padRight = 18;
  const padTop = 22;
  const padBottom = 34;

  const primaryVals = slice.map(meta.getValue);
  const rawMin = Math.min(...primaryVals);
  const rawMax = Math.max(...primaryVals);
  const padding = Math.max((rawMax - rawMin) * 0.22, metric === 'sleep' ? 0.25 : 4);
  const minVal = Math.max(0, rawMin - padding);
  const maxVal = rawMax + padding;
  const range = Math.max(maxVal - minVal, 0.01);

  const avgPrimary =
    primaryVals.reduce((acc, v) => acc + v, 0) / Math.max(primaryVals.length, 1);

  const points = slice.map((pt, i) => {
    const x =
      padLeft +
      (i / Math.max(slice.length - 1, 1)) * (width - padLeft - padRight);
    const val = meta.getValue(pt);
    const y =
      height -
      padBottom -
      ((val - minVal) / range) * (height - padTop - padBottom);
    return { x, y, val, pt };
  });

  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaD =
    points.length > 0
      ? `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${height - padBottom} L ${points[0].x.toFixed(1)} ${height - padBottom} Z`
      : '';

  const yTicks = [0, 0.33, 0.66, 1].map((ratio) => {
    const val = minVal + ratio * range;
    const y = height - padBottom - ratio * (height - padTop - padBottom);
    return {
      y,
      label: metric === 'sleep' ? val.toFixed(1) : Math.round(val).toString(),
    };
  });

  const activePoint =
    selectedIdx !== null && points[selectedIdx]
      ? points[selectedIdx]
      : points[points.length - 1];

  return (
    <section className="vault-card rounded-2xl p-6" aria-label="Unified Telemetry Timeline">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A] tracking-tight">
            Cross-Source Telemetry &amp; Lab Correlation
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {meta.baselineText} · Period mean:{' '}
            <span className="font-mono font-medium text-[#0F172A] tabular-nums">
              {metric === 'sleep' ? avgPrimary.toFixed(2) : Math.round(avgPrimary)} {meta.unit}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80"
            role="tablist"
            aria-label="Telemetry metric selector"
          >
            {(
              [
                ['hrv', 'HRV'],
                ['sleep', 'Deep Sleep'],
                ['glucose', 'Glucose'],
                ['anomaly', 'Anomaly'],
              ] as [MetricMode, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={metric === key}
                onClick={() => {
                  setMetric(key);
                  setSelectedIdx(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  metric === key
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80"
            role="group"
            aria-label="Timeframe window"
          >
            {([7, 14, 30] as TimeframeDays[]).map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={timeframe === days}
                onClick={() => {
                  setTimeframe(days);
                  setSelectedIdx(null);
                }}
                className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timeframe === days
                    ? 'bg-[#0F172A] text-white'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Day Inspector Strip */}
      {activePoint && (
        <div className="flex flex-wrap items-center justify-between gap-4 py-3.5 text-xs border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            <span className="font-mono font-semibold text-[#0F172A]">
              {activePoint.pt.date}
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              {meta.label}:{' '}
              <strong className="font-mono text-[#0F172A] tabular-nums">
                {activePoint.val} {meta.unit}
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              {meta.secondaryLabel}:{' '}
              <strong className="font-mono text-[#0F172A] tabular-nums">
                {meta.getSecondary(activePoint.pt)} {meta.secondaryUnit}
              </strong>
            </span>
          </div>
          {activePoint.pt.labDrawEvent ? (
            <span className="font-mono text-[#006C49] font-medium">
              Lab Anchor: {activePoint.pt.labDrawEvent}
            </span>
          ) : (
            <span className="font-mono text-slate-400">
              Move cursor across timeline to inspect daily enclave frame
            </span>
          )}
        </div>
      )}

      {/* Main SVG Plot */}
      <div className="pt-3 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[540px] h-64 block select-none"
          role="img"
          aria-label={`${meta.label} over the past ${timeframe} days`}
          onMouseLeave={() => setSelectedIdx(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const svgX = relX * width;
            const plotW = width - padLeft - padRight;
            const ratio = Math.max(0, Math.min(1, (svgX - padLeft) / plotW));
            const idx = Math.round(ratio * (points.length - 1));
            setSelectedIdx(idx);
          }}
        >
          <defs>
            <linearGradient id="unifiedAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={meta.color} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Y-axis labels */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={width - padRight}
                y2={tick.y}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray={idx === 0 ? undefined : '3 3'}
              />
              <text
                x={padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Analog Lab Draw Vertical Anchors */}
          {points.map((p, idx) =>
            p.pt.labDrawEvent ? (
              <g key={`lab-${idx}`}>
                <line
                  x1={p.x}
                  y1={padTop}
                  x2={p.x}
                  y2={height - padBottom}
                  stroke="#10B981"
                  strokeWidth="1.25"
                  strokeDasharray="4 3"
                />
                <circle
                  cx={p.x}
                  cy={padTop + 2}
                  r="4"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <text
                  x={p.x + 6}
                  y={padTop + 6}
                  className="fill-[#006C49] text-[10px] font-mono font-medium"
                >
                  Lab Draw
                </text>
              </g>
            ) : null,
          )}

          {/* Area & Line */}
          <path d={areaD} fill="url(#unifiedAreaGrad)" />
          <path
            d={lineD}
            fill="none"
            stroke={meta.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Nodes */}
          {points.map((p, idx) => {
            const isHovered = activePoint?.pt.date === p.pt.date;
            const showDot = timeframe <= 14 || isHovered || p.pt.labDrawEvent;
            if (!showDot) return null;
            return (
              <circle
                key={p.pt.date}
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5 : 3}
                fill={isHovered ? '#FFFFFF' : meta.color}
                stroke={meta.color}
                strokeWidth={isHovered ? 2.5 : 1.5}
              />
            );
          })}

          {/* Vertical Hover Scrubber */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={padTop}
              x2={activePoint.x}
              y2={height - padBottom}
              stroke="#0F172A"
              strokeOpacity="0.22"
              strokeWidth="1"
            />
          )}

          {/* X-axis Labels */}
          {points.map((p, idx) => {
            const step = timeframe === 30 ? 5 : timeframe === 14 ? 2 : 1;
            if (idx % step !== 0 && idx !== points.length - 1) return null;
            return (
              <text
                key={`x-${p.pt.date}`}
                x={p.x}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-mono"
              >
                {p.pt.label}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
};
