import React from "react";

interface ReportSummaryTileProps {
  label: string;
  value: string | number;
  caption?: string;
  tone?: "primary" | "success" | "warning" | "critical" | "neutral";
}

export function ReportSummaryTile({
  label,
  value,
  caption,
  tone = "primary",
}: ReportSummaryTileProps) {
  return (
    <div className={`rpt-summary-tile rpt-summary-tile-${tone}`}>
      <div className="rpt-summary-tile-label">{label}</div>
      <div className="rpt-summary-tile-value">{value}</div>
      {caption && <div className="rpt-summary-tile-caption">{caption}</div>}
    </div>
  );
}
