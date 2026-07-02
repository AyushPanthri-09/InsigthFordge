import type { KPI } from "@/services/analytics/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { motion } from "motion/react";

interface KpiCardProps {
  kpi: KPI;
  index?: number;
}

export function KpiCard({ kpi, index = 0 }: KpiCardProps) {
  const isUp = kpi.trend?.direction === "up";
  const isDown = kpi.trend?.direction === "down";
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const trendColor = isUp
    ? "text-success bg-success/10"
    : isDown
      ? "text-destructive bg-destructive/10"
      : "text-muted-foreground bg-muted/40";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.05,
      }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      className="card-elevated group relative cursor-default p-5 transition-[box-shadow,border-color] duration-250 hover:border-primary/20 hover:shadow-[var(--shadow-card-hover)]"
    >
      {/* Label + badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {kpi.label}
        </div>
        <ConfidenceBadge value={kpi.confidence} />
      </div>

      {/* Value + trend */}
      <div className="mt-3 flex items-baseline gap-2.5">
        <div className="font-display text-3xl font-semibold tabular-nums tracking-tight">
          {kpi.formattedValue}
        </div>
        {kpi.trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${trendColor}`}
          >
            <TrendIcon className="h-3 w-3" />
            {Math.abs(kpi.trend.pct).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Rationale */}
      <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {kpi.rationale}
      </p>
    </motion.div>
  );
}

/** Skeleton placeholder while KPIs load */
export function KpiCardSkeleton() {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-4 w-12 rounded-full" />
      </div>
      <div className="skeleton mt-3 h-9 w-32 rounded" />
      <div className="skeleton mt-3 h-3 w-full rounded" />
      <div className="skeleton mt-1.5 h-3 w-2/3 rounded" />
    </div>
  );
}
