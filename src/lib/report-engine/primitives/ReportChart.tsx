import React from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { ChartSpec } from "@/services/analytics/types";

const PALETTE = [
  "var(--rpt-c1)", "var(--rpt-c2)", "var(--rpt-c3)", "var(--rpt-c4)",
  "var(--rpt-c5)", "var(--rpt-c6)", "var(--rpt-c7)", "var(--rpt-c8)",
];

const TICK_STYLE = { fill: "var(--rpt-text-muted)", fontSize: 9, fontFamily: "var(--rpt-font)" };
const TOOLTIP_STYLE = {
  background: "var(--rpt-surface2)",
  border: "1px solid var(--rpt-border)",
  borderRadius: 8,
  fontSize: 11,
  color: "var(--rpt-text)",
};

function fmt(v: unknown): string {
  const n = Number(v);
  if (!isFinite(n)) return String(v ?? "");
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

interface ReportChartProps {
  spec: ChartSpec;
  height?: number;
}

export function ReportChart({ spec, height = 200 }: ReportChartProps) {
  const data = spec.data as Record<string, unknown>[];
  if (!data?.length) return null;

  const yKeys = spec.yKeys ?? [spec.yKeys?.[0] ?? "value"];

  if (spec.type === "pie") {
    const key = yKeys[0] ?? "value";
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={key}
            nameKey={spec.xKey ?? "name"}
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius="75%"
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v)} />
          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: 9, color: "var(--rpt-text-muted)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (spec.type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rpt-border)" />
          <>
              <XAxis dataKey={spec.xKey} tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} tickFormatter={fmt} axisLine={false} tickLine={false} width={40} />
            </>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v)} />
          {yKeys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} maxBarSize={32} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (spec.type === "area") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <defs>
            {yKeys.map((k, i) => (
              <linearGradient key={k} id={`grad_${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rpt-border)" />
          <XAxis dataKey={spec.xKey} tick={TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={TICK_STYLE} tickFormatter={fmt} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v)} />
          {yKeys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              fill={`url(#grad_${k})`}
              dot={false}
              connectNulls
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Default: line
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rpt-border)" />
        <XAxis dataKey={spec.xKey} tick={TICK_STYLE} axisLine={false} tickLine={false} />
        <YAxis tick={TICK_STYLE} tickFormatter={fmt} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v)} />
        {yKeys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
