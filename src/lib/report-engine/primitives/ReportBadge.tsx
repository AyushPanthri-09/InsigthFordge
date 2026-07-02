import React from "react";
import type { ReportSeverity, PriorityLevel, EffortLevel } from "../types";

type BadgeVariant =
  ReportSeverity | PriorityLevel | EffortLevel | "brand" | "neutral";

interface ReportBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

const DOT_COLORS: Record<string, string> = {
  critical: "var(--rpt-critical)",
  warning: "var(--rpt-warning)",
  info: "var(--rpt-info)",
  success: "var(--rpt-success)",
  high: "var(--rpt-p-high)",
  medium: "var(--rpt-p-medium)",
  low: "var(--rpt-p-low)",
  brand: "var(--rpt-brand-light)",
  neutral: "var(--rpt-text-muted)",
};

function variantClass(v: BadgeVariant): string {
  if (v === "critical") return "rpt-badge-critical";
  if (v === "warning") return "rpt-badge-warning";
  if (v === "info") return "rpt-badge-info";
  if (v === "success") return "rpt-badge-success";
  if (v === "high") return "rpt-badge-critical";
  if (v === "medium") return "rpt-badge-warning";
  if (v === "low") return "rpt-badge-success";
  if (v === "brand") return "rpt-badge-brand";
  return "rpt-badge-neutral";
}

export function ReportBadge({
  label,
  variant = "neutral",
  dot = false,
}: ReportBadgeProps) {
  return (
    <span className={`rpt-badge ${variantClass(variant)}`}>
      {dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: DOT_COLORS[variant] ?? "currentColor",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
}
