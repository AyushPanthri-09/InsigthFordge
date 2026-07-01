import type { KPI } from "@/services/analytics/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export function KpiCard({ kpi }: { kpi: KPI }) {
  const TrendIcon = kpi.trend?.direction === "up" ? TrendingUp
    : kpi.trend?.direction === "down" ? TrendingDown
    : Minus;
  return (
    <div className="card-elevated p-5 transition hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {kpi.label}
        </div>
        <ConfidenceBadge value={kpi.confidence} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="font-display text-3xl font-semibold tracking-tight">
          {kpi.formattedValue}
        </div>
        {kpi.trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${kpi.trend.direction === "up" ? "text-success" : kpi.trend.direction === "down" ? "text-destructive" : "text-muted-foreground"}`}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(kpi.trend.pct).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{kpi.rationale}</p>
    </div>
  );
}