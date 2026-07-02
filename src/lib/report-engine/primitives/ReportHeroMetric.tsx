import React from "react";

interface ReportHeroMetricProps {
  label: string;
  value: string | number;
  trend?: number;
  variant?: "primary" | "success" | "warning";
  badge?: string;
}

export function ReportHeroMetric({
  label,
  value,
  trend,
  variant = "primary",
  badge,
}: ReportHeroMetricProps) {
  const hasTrend = typeof trend === "number" && Number.isFinite(trend);

  return (
    <div className={`rpt-hero-metric rpt-hero-metric-${variant}`}>
      <div className="rpt-hero-metric-topline">
        <span>{label}</span>
        {badge && <span className="rpt-hero-metric-badge">{badge}</span>}
      </div>
      <div className="rpt-hero-metric-value">{value}</div>
      {hasTrend && (
        <div
          className={
            trend >= 0
              ? "rpt-hero-metric-trend-up"
              : "rpt-hero-metric-trend-down"
          }
        >
          {trend >= 0 ? "+" : ""}
          {trend.toFixed(1)}% vs benchmark
        </div>
      )}
    </div>
  );
}
