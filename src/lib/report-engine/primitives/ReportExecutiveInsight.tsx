import React from "react";

interface ReportExecutiveInsightProps {
  insight: string;
  impact: string;
  confidence: number;
  status?: "success" | "warning" | "critical";
}

function normalizeConfidence(value: number): number {
  const percent = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, percent));
}

export function ReportExecutiveInsight({
  insight,
  impact,
  confidence,
  status = "success",
}: ReportExecutiveInsightProps) {
  const normalized = normalizeConfidence(confidence);

  return (
    <div className={`rpt-executive-insight rpt-executive-insight-${status}`}>
      <div>
        <div className="rpt-executive-insight-label">Executive Insight</div>
        <p className="rpt-executive-insight-text">{insight}</p>
        <p className="rpt-executive-insight-impact">{impact}</p>
      </div>
      <div className="rpt-executive-confidence">
        <div className="rpt-executive-confidence-value">
          {Math.round(normalized)}%
        </div>
        <div className="rpt-executive-confidence-label">Confidence</div>
      </div>
    </div>
  );
}
