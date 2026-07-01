import type { ChartSpec } from "@/services/analytics/types";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";

const COLORS = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f472b6"];

export function ChartCard({ spec }: { spec: ChartSpec }) {
  return (
    <div className="card-elevated overflow-hidden">
      <div className="border-b border-border/60 p-5">
        <h3 className="text-sm font-semibold">{spec.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{spec.description}</p>
      </div>
      <div className="p-4">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(spec)}
          </ResponsiveContainer>
        </div>
        {spec.insight && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
            <span className="font-semibold text-primary">AI insight:</span>{" "}
            <span className="text-foreground/80">{spec.insight}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function renderChart(spec: ChartSpec) {
  const tooltipStyle = {
    backgroundColor: "oklch(0.22 0.025 270)",
    border: "1px solid oklch(1 0 0 / 12%)",
    borderRadius: 12,
    fontSize: 12,
  };
  if (spec.type === "pie") {
    return (
      <PieChart>
        <Pie data={spec.data} dataKey={spec.yKeys[0]} nameKey={spec.xKey} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
          {spec.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    );
  }
  if (spec.type === "area" || spec.type === "line") {
    return (
      <AreaChart data={spec.data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          {spec.yKeys.map((k, i) => (
            <linearGradient key={k} id={`grad-${spec.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.5} />
              <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
        <XAxis dataKey={spec.xKey} tick={{ fill: "currentColor", fontSize: 11 }} stroke="oklch(1 0 0 / 15%)" />
        <YAxis tick={{ fill: "currentColor", fontSize: 11 }} stroke="oklch(1 0 0 / 15%)" />
        <Tooltip contentStyle={tooltipStyle} />
        {spec.yKeys.map((k, i) => (
          <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                fill={`url(#grad-${spec.id}-${i})`} />
        ))}
      </AreaChart>
    );
  }
  return (
    <BarChart data={spec.data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
      <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
      <XAxis dataKey={spec.xKey} tick={{ fill: "currentColor", fontSize: 11 }} stroke="oklch(1 0 0 / 15%)" interval={0} angle={-20} textAnchor="end" height={60} />
      <YAxis tick={{ fill: "currentColor", fontSize: 11 }} stroke="oklch(1 0 0 / 15%)" />
      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 4%)" }} />
      {spec.yKeys.map((k, i) => (
        <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} />
      ))}
    </BarChart>
  );
}