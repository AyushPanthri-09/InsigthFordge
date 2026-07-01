import React from "react";
import type { P7RecommendationsData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBadge } from "../primitives/ReportBadge";

const TOTAL_PAGES = 9;

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

interface Props { data: P7RecommendationsData; datasetName: string; generatedAt: string; }

export function P7_Recommendations({ data, datasetName, generatedAt }: Props) {
  const sorted = [...data.recommendations].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  );

  return (
    <ReportPage pageNumber={8} totalPages={TOTAL_PAGES} title="Recommendations" datasetName={datasetName} generatedAt={generatedAt}>
      {data.executiveSummary && (
        <div className="rpt-card-accent" style={{ marginBottom: 24 }}>
          <div className="rpt-label" style={{ marginBottom: 6 }}>Executive Summary</div>
          <div style={{ fontSize: 12, color: "var(--rpt-text-muted)", lineHeight: 1.7 }}>{data.executiveSummary}</div>
        </div>
      )}

      <ReportSection title="Prioritised Recommendations">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sorted.map((rec, i) => (
            <div key={rec.id} className="rpt-card" style={{ position: "relative", overflow: "hidden" }}>
              {/* Priority accent bar */}
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
                background:
                  rec.priority === "critical" ? "var(--rpt-critical)" :
                  rec.priority === "high"     ? "var(--rpt-p-high)" :
                  rec.priority === "medium"   ? "var(--rpt-warning)" :
                  "var(--rpt-success)",
              }} />
              <div style={{ paddingLeft: 12 }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    background: "var(--rpt-surface2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: "var(--rpt-text-muted)",
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <div className="rpt-h3">{rec.title}</div>
                      <ReportBadge label={rec.priority} variant={rec.priority} dot />
                      <ReportBadge label={`${rec.effort} effort`} variant="neutral" />
                      <ReportBadge label={rec.timeHorizon} variant="info" />
                      <ReportBadge label={`${Math.round(rec.confidence * 100)}% confidence`} variant="brand" />
                    </div>
                  </div>
                </div>

                {/* Observation */}
                {rec.observation && (
                  <div style={{ marginBottom: 6 }}>
                    <div className="rpt-label" style={{ marginBottom: 2 }}>Observation</div>
                    <div style={{ fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.5 }}>{rec.observation}</div>
                  </div>
                )}

                {/* Recommendation */}
                <div style={{ marginBottom: 8 }}>
                  <div className="rpt-label" style={{ marginBottom: 2 }}>Recommendation</div>
                  <div style={{ fontSize: 11, lineHeight: 1.5 }}>{rec.recommendation}</div>
                </div>

                {/* Impact / Risk / Metric row */}
                <div className="rpt-grid rpt-grid-3" style={{ gap: 8 }}>
                  {[
                    { label: "Expected Impact",   text: rec.expectedImpact },
                    { label: "Risk of Inaction",  text: rec.riskOfInaction },
                    { label: "Success Metric",    text: rec.successMetric },
                  ].map(({ label, text }) => (
                    <div key={label} style={{ background: "var(--rpt-surface2)", borderRadius: 8, padding: "8px 10px" }}>
                      <div className="rpt-label" style={{ marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 10, color: "var(--rpt-text-muted)", lineHeight: 1.4 }}>{text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ReportSection>
    </ReportPage>
  );
}
