import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ChartSpec } from "@/services/analytics/types";
import { sanitizeReportText, sanitizeReportValue } from "../report-sanitizer";

const PALETTE = [
  "var(--rpt-c1)",
  "var(--rpt-c2)",
  "var(--rpt-c3)",
  "var(--rpt-c4)",
  "var(--rpt-c5)",
  "var(--rpt-c6)",
  "var(--rpt-c7)",
  "var(--rpt-c8)",
];

const TICK_STYLE = {
  fill: "var(--rpt-text-muted)",
  fontSize: 9,
  fontFamily: "var(--rpt-font)",
};
const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid var(--rpt-border)",
  borderRadius: 8,
  fontSize: 11,
  color: "var(--rpt-text)",
  boxShadow: "0 10px 24px rgba(16, 24, 40, 0.12)",
};

function fmt(v: unknown): string {
  const n = Number(v);
  if (!isFinite(n)) return String(v ?? "");
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function safeChartId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

interface ReportChartProps {
  spec: ChartSpec;
  height?: number;
}

export function ReportChart({ spec, height = 200 }: ReportChartProps) {
  const cleanedTitle = sanitizeReportText(spec.title);
  const cleanedDescription = sanitizeReportText(spec.description ?? "");
  const rawData = spec.data as Record<string, unknown>[];
  const data = (
    Array.isArray(rawData)
      ? rawData.map((row) => sanitizeReportValue(row as unknown as Record<string, unknown>))
      : []
  ) as Record<string, unknown>[];

  const yKeys = spec.yKeys ?? [spec.yKeys?.[0] ?? "value"];
  const validData = data.filter((row) =>
    yKeys.some((key) => {
      const value = row[key];
      if (typeof value === "number") return Number.isFinite(value);
      if (typeof value === "string") return sanitizeReportText(value) !== "";
      return value != null;
    }),
  );

  if (!validData.length) {
    return (
      <div
        className="rpt-stat-tile"
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--rpt-text-muted)",
          fontSize: 10,
          textAlign: "center",
        }}
      >
        Chart unavailable: source values are missing or contain unsupported placeholders.
      </div>
    );
  }

  const chartSpec = {
    ...spec,
    title: cleanedTitle,
    description: cleanedDescription,
    data: validData,
  } as ChartSpec;

  if (chartSpec.type === "pie") {
    const key = yKeys[0] ?? "value";
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartSpec.data as Record<string, unknown>[]}
            dataKey={key}
            nameKey={chartSpec.xKey ?? "name"}
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
          <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: "var(--rpt-text-muted)" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartSpec.type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartSpec.data as Record<string, unknown>[]}
          layout="horizontal"
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rpt-border-light)" vertical={false} />
          <>
            <XAxis dataKey={chartSpec.xKey} tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis
              tick={TICK_STYLE}
              tickFormatter={fmt}
              axisLine={false}
              tickLine={false}
              width={40}
            />
          </>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v)} />
          {yKeys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              fill={PALETTE[i % PALETTE.length]}
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartSpec.type === "area") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartSpec.data as Record<string, unknown>[]}
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        >
          <defs>
            {yKeys.map((k, i) => (
              <linearGradient
                key={k}
                id={`grad_${safeChartId(`${chartSpec.id}_${k}`)}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rpt-border-light)" vertical={false} />
          <XAxis dataKey={chartSpec.xKey} tick={TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis
            tick={TICK_STYLE}
            tickFormatter={fmt}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v)} />
          {yKeys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              fill={`url(#grad_${safeChartId(`${chartSpec.id}_${k}`)})`}
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
      <LineChart
        data={chartSpec.data as Record<string, unknown>[]}
        margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rpt-border-light)" vertical={false} />
        <XAxis dataKey={chartSpec.xKey} tick={TICK_STYLE} axisLine={false} tickLine={false} />
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
