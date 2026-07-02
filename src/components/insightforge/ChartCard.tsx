import type { ChartSpec } from "@/services/analytics/types";
import { Sparkles } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";

const COLORS = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f472b6"];

const tooltipStyle = {
  backgroundColor: "oklch(0.22 0.025 270)",
  border: "1px solid oklch(1 0 0 / 12%)",
  borderRadius: 10,
  fontSize: 12,
  color: "oklch(0.97 0.005 270)",
  boxShadow: "0 8px 32px oklch(0 0 0 / 40%)",
};

export function ChartCard({ spec }: { spec: ChartSpec }) {
  return (
    <div className="card-elevated card-hover overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="border-b border-border/60 px-5 py-4">
        <h3 className="text-sm font-semibold">{spec.title}</h3>
        {spec.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{spec.description}</p>
        )}
      </div>

      {/* Chart */}
      <div className="p-4">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(spec)}
          </ResponsiveContainer>
        </div>

        {/* AI insight */}
        {spec.insight && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-foreground/85">{spec.insight}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function renderChart(spec: ChartSpec) {
  if (spec.type === "pie") {
    return (
      <PieChart>
        <Pie
          data={spec.data}
          dataKey={spec.yKeys[0]}
          nameKey={spec.xKey}
          cx="50%"
          cy="50%"
          outerRadius={95}
          innerRadius={55}
          paddingAngle={2}
          strokeWidth={0}
        >
          {spec.data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    );
  }

  if (spec.type === "area" || spec.type === "line") {
    return (
      <AreaChart data={spec.data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <defs>
          {spec.yKeys.map((k, i) => (
            <linearGradient key={k} id={`grad-${spec.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.45} />
              <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={spec.xKey}
          tick={{ fill: "oklch(0.68 0.025 270)", fontSize: 11 }}
          stroke="oklch(1 0 0 / 10%)"
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "oklch(0.68 0.025 270)", fontSize: 11 }}
          stroke="oklch(1 0 0 / 10%)"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "oklch(1 0 0 / 10%)", strokeWidth: 1 }} />
        {spec.yKeys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            fill={`url(#grad-${spec.id}-${i})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    );
  }

  // Default: bar
  return (
    <BarChart data={spec.data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
      <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} strokeDasharray="3 3" />
      <XAxis
        dataKey={spec.xKey}
        tick={{ fill: "oklch(0.68 0.025 270)", fontSize: 11 }}
        stroke="oklch(1 0 0 / 10%)"
        tickLine={false}
        interval={0}
        angle={-20}
        textAnchor="end"
        height={56}
      />
      <YAxis
        tick={{ fill: "oklch(0.68 0.025 270)", fontSize: 11 }}
        stroke="oklch(1 0 0 / 10%)"
        tickLine={false}
        axisLine={false}
      />
      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 4%)", radius: 4 }} />
      {spec.yKeys.map((k, i) => (
        <Bar
          key={k}
          dataKey={k}
          fill={COLORS[i % COLORS.length]}
          radius={[5, 5, 0, 0]}
          maxBarSize={48}
        />
      ))}
    </BarChart>
  );
}