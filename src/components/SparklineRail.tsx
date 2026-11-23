import React, { useState } from 'react';

interface SparklinePoint {
  label: string;
  value: number;
}

interface SparklineRailProps {
  points: SparklinePoint[];
  unit: string;
  strokeColor?: string;
  baselineMin?: number;
  baselineMax?: number;
  ariaLabel: string;
}

export const SparklineRail: React.FC<SparklineRailProps> = ({
  points,
  unit,
  strokeColor = '#06B6D4',
  baselineMin,
  baselineMax,
  ariaLabel,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div className="h-14 flex items-center text-xs text-slate-400 font-mono">
        Insufficient telemetry
      </div>
    );
  }

  const width = 260;
  const height = 56;
  const padX = 4;
  const padY = 6;

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values, baselineMin ?? Infinity) * 0.96;
  const maxVal = Math.max(...values, baselineMax ?? -Infinity) * 1.04;
  const range = Math.max(maxVal - minVal, 0.01);

  const coords = points.map((pt, i) => {
    const x = padX + (i / (points.length - 1)) * (width - padX * 2);
    const y = height - padY - ((pt.value - minVal) / range) * (height - padY * 2);
    return { x, y, ...pt };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height} L ${coords[0].x.toFixed(1)} ${height} Z`;

  const activePoint = hoveredIdx !== null ? coords[hoveredIdx] : null;

  const baselineBand =
    baselineMin !== undefined && baselineMax !== undefined
      ? {
          yTop:
            height -
            padY -
            ((baselineMax - minVal) / range) * (height - padY * 2),
          yBottom:
            height -
            padY -
            ((baselineMin - minVal) / range) * (height - padY * 2),
        }
      : null;

  return (
    <div className="relative select-none" aria-label={ariaLabel}>
      <div className="flex items-center justify-between h-4 mb-1">
        <span className="text-[11px] font-mono text-slate-500 tabular-nums">
          {activePoint ? activePoint.label : `${points[0].label} – ${points[points.length - 1].label}`}
        </span>
        {activePoint ? (
          <span className="text-[11px] font-mono font-medium text-[#0F172A] tabular-nums">
            {activePoint.value} {unit}
          </span>
        ) : (
          <span className="text-[11px] font-mono text-slate-400">
            Hover to scrub
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-14 overflow-visible block"
        onMouseLeave={() => setHoveredIdx(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = (e.clientX - rect.left) / rect.width;
          const idx = Math.max(
            0,
            Math.min(points.length - 1, Math.round(relX * (points.length - 1))),
          );
          setHoveredIdx(idx);
        }}
      >
        <defs>
          <linearGradient id={`grad-${ariaLabel.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {baselineBand && (
          <rect
            x={padX}
            y={Math.max(0, baselineBand.yTop)}
            width={width - padX * 2}
            height={Math.max(2, baselineBand.yBottom - baselineBand.yTop)}
            fill="#10B981"
            fillOpacity="0.07"
            rx="2"
          />
        )}

        <path
          d={areaPath}
          fill={`url(#grad-${ariaLabel.replace(/\s+/g, '-')})`}
        />

        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {activePoint ? (
          <>
            <line
              x1={activePoint.x}
              y1={2}
              x2={activePoint.x}
              y2={height - 2}
              stroke="#0F172A"
              strokeOpacity="0.28"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="3.5"
              fill="#FFFFFF"
              stroke={strokeColor}
              strokeWidth="2"
            />
          </>
        ) : (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="3"
            fill={strokeColor}
          />
        )}
      </svg>
    </div>
  );
};
