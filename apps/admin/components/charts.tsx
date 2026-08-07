"use client";

/**
 * Dependency-free SVG chart kit for the admin dashboard.
 *
 * Everything renders as a scalable <svg> with a fixed viewBox, so charts are
 * responsive without a resize listener and add zero KB of third-party JS.
 * Palettes below are validated for colour-vision deficiency against a white
 * chart surface — keep the slot order when adding series.
 */

import { memo, useMemo, useState } from "react";

// Categorical slots (identity). Fixed order — never cycle or recolour by rank.
export const SERIES_COLORS = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
} as const;

// Ordinal ramp (easy → hard style scales): one hue, light → dark.
export const ORDINAL_BLUE = ["#86b6ef", "#3987e5", "#184f95"] as const;

// Status colours are reserved — always paired with a label, never colour alone.
export const STATUS_COLORS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  neutral: "#898781",
} as const;

const INK = {
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
};

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat(undefined, { notation: value >= 10000 ? "compact" : "standard" }).format(value);
}

// Rounded-at-the-data-end bar path (4px radius), anchored flat to the baseline.
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const radius = Math.max(0, Math.min(r, h, w / 2));
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `L ${x + w - radius} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + radius}`,
    `L ${x + w} ${y + h}`,
    "Z",
  ].join(" ");
}

function niceCeil(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

/* ------------------------------------------------------------------ *
 * Trend chart — multi-series area + line with a hover crosshair.
 * ------------------------------------------------------------------ */

export type TrendSeries = {
  key: string;
  label: string;
  color: string;
  values: number[];
};

const VB_W = 720;
const VB_H = 240;
const PAD = { top: 16, right: 16, bottom: 30, left: 40 };

export const TrendChart = memo(function TrendChart({
  labels,
  series,
}: {
  labels: string[];
  series: TrendSeries[];
}) {
  const [active, setActive] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const max = niceCeil(Math.max(1, ...series.flatMap((item) => item.values)));
    const innerW = VB_W - PAD.left - PAD.right;
    const innerH = VB_H - PAD.top - PAD.bottom;
    const stepX = labels.length > 1 ? innerW / (labels.length - 1) : 0;

    const pointX = (index: number) => PAD.left + index * stepX;
    const pointY = (value: number) => PAD.top + innerH - (value / max) * innerH;

    const paths = series.map((item) => {
      const line = item.values
        .map((value, index) => `${index === 0 ? "M" : "L"} ${pointX(index)} ${pointY(value)}`)
        .join(" ");
      const area = `${line} L ${pointX(item.values.length - 1)} ${PAD.top + innerH} L ${pointX(0)} ${
        PAD.top + innerH
      } Z`;
      return { ...item, line, area };
    });

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      value: Math.round(max * ratio),
      y: PAD.top + innerH - ratio * innerH,
    }));

    return { max, innerW, innerH, stepX, pointX, pointY, paths, ticks };
  }, [labels, series]);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        height="240"
        role="img"
        aria-label="Records created per month"
        className="overflow-visible"
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          {geometry.paths.map((item) => (
            <linearGradient key={item.key} id={`trend-${item.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={item.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={item.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {geometry.ticks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={PAD.left}
              x2={VB_W - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke={INK.grid}
              strokeWidth="1"
            />
            <text x={PAD.left - 8} y={tick.y + 4} textAnchor="end" fontSize="11" fill={INK.muted}>
              {tick.value}
            </text>
          </g>
        ))}

        {geometry.paths.map((item) => (
          <path key={`${item.key}-area`} d={item.area} fill={`url(#trend-${item.key})`} />
        ))}
        {geometry.paths.map((item) => (
          <path
            key={`${item.key}-line`}
            d={item.line}
            fill="none"
            stroke={item.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {labels.map((label, index) => (
          <text
            key={label}
            x={geometry.pointX(index)}
            y={VB_H - 8}
            textAnchor="middle"
            fontSize="11"
            fill={INK.muted}
          >
            {label}
          </text>
        ))}

        {active !== null && (
          <g pointerEvents="none">
            <line
              x1={geometry.pointX(active)}
              x2={geometry.pointX(active)}
              y1={PAD.top}
              y2={PAD.top + geometry.innerH}
              stroke={INK.axis}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {geometry.paths.map((item) => (
              <circle
                key={`${item.key}-dot`}
                cx={geometry.pointX(active)}
                cy={geometry.pointY(item.values[active] ?? 0)}
                r="5"
                fill={item.color}
                stroke="#ffffff"
                strokeWidth="2"
              />
            ))}
          </g>
        )}

        {labels.map((label, index) => (
          <rect
            key={`hit-${label}`}
            x={geometry.pointX(index) - geometry.stepX / 2}
            y={PAD.top}
            width={geometry.stepX || geometry.innerW}
            height={geometry.innerH}
            fill="transparent"
            onMouseEnter={() => setActive(index)}
          />
        ))}
      </svg>

      {active !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[9rem] -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg"
          style={{
            left: `${((PAD.left + active * geometry.stepX) / VB_W) * 100}%`,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {labels[active]}
          </p>
          <div className="mt-1.5 space-y-1">
            {series.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                  {item.label}
                </span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {item.values[active] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ *
 * Donut — part-to-whole with a hero figure in the middle.
 * ------------------------------------------------------------------ */

export type DonutSlice = { key: string; label: string; value: number; color: string };

export const DonutChart = memo(function DonutChart({
  slices,
  centerValue,
  centerLabel,
  size = 168,
}: {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const gap = 3; // 2px surface gap between adjacent fills (scaled by stroke)

  let offset = 0;

  return (
    <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={centerLabel}>
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#eef1f6" strokeWidth="16" />
      {total > 0 &&
        slices.map((slice) => {
          const length = (slice.value / total) * circumference;
          const dash = Math.max(0, length - gap);
          const element = (
            <circle
              key={slice.key}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="16"
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += length;
          return element;
        })}
      <text
        x="70"
        y="66"
        textAnchor="middle"
        fontSize="26"
        fontWeight="600"
        fill="#0b0b0b"
      >
        {centerValue}
      </text>
      <text x="70" y="86" textAnchor="middle" fontSize="10" fill={INK.muted}>
        {centerLabel}
      </text>
    </svg>
  );
});

/* ------------------------------------------------------------------ *
 * Vertical bars — magnitude across a small ordered set.
 * ------------------------------------------------------------------ */

export type BarDatum = { key: string; label: string; value: number; color: string };

export const BarChart = memo(function BarChart({
  data,
  height = 200,
}: {
  data: BarDatum[];
  height?: number;
}) {
  const [active, setActive] = useState<string | null>(null);
  const width = 320;
  const pad = { top: 24, right: 8, bottom: 28, left: 8 };
  const innerH = height - pad.top - pad.bottom;
  const max = niceCeil(Math.max(1, ...data.map((item) => item.value)));
  const slot = (width - pad.left - pad.right) / Math.max(1, data.length);
  const barW = Math.min(46, slot - 14);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="Distribution"
      onMouseLeave={() => setActive(null)}
    >
      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={pad.top + innerH}
        y2={pad.top + innerH}
        stroke={INK.axis}
        strokeWidth="1"
      />
      {data.map((item, index) => {
        const h = Math.max(2, (item.value / max) * innerH);
        const x = pad.left + index * slot + (slot - barW) / 2;
        const y = pad.top + innerH - h;
        return (
          <g
            key={item.key}
            onMouseEnter={() => setActive(item.key)}
            opacity={active && active !== item.key ? 0.55 : 1}
          >
            <path d={barPath(x, y, barW, h)} fill={item.color} />
            <text
              x={x + barW / 2}
              y={y - 8}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="#0b0b0b"
            >
              {formatNumber(item.value)}
            </text>
            <text
              x={x + barW / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fill={INK.secondary}
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
});

/* ------------------------------------------------------------------ *
 * Horizontal bar list — ranked categories with direct labels.
 * ------------------------------------------------------------------ */

export const BarList = memo(function BarList({ data }: { data: BarDatum[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <ul className="space-y-3.5">
      {data.map((item) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium text-slate-700">{item.label}</span>
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {formatNumber(item.value)}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${Math.max(2, (item.value / max) * 100)}%`,
                background: item.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
});

/* ------------------------------------------------------------------ *
 * Legend — identity is never carried by colour alone.
 * ------------------------------------------------------------------ */

export function ChartLegend({
  items,
}: {
  items: Array<{ key: string; label: string; color: string; value?: number | string }>;
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
          <span>{item.label}</span>
          {item.value !== undefined && (
            <span className="font-semibold tabular-nums text-slate-900">{item.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
