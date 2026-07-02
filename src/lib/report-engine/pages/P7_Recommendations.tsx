import React from "react";
import type { P7RecommendationsData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBadge } from "../primitives/ReportBadge";

interface Props {
  data: P7RecommendationsData;
  datasetName: string;
  generatedAt: string;
}

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function priorityColor(priority: string): string {
  if (priority === "critical") return "var(--rpt-critical)";
  if (priority === "high") return "var(--rpt-p-high)";
  if (priority === "medium") return "var(--rpt-warning)";
  return "var(--rpt-success)";
}

export function P7_Recommendations({ data, datasetName, generatedAt }: Props) {
  const sorted = [...data.recommendations].sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  );

  const highPriorityCount = sorted.filter(
    (r) => r.priority === "critical" || r.priority === "high",
  ).length;

  return (
    <ReportPage
      pageNumber={12}
      totalPages={13}
      title="Strategic Recommendations"
      subtitle="Prioritized strategic recommendations, expected impact, timeline, and execution difficulty"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Action Thesis Summary */}
        {data.executiveSummary && (
          <div
            style={{
              background: "var(--rpt-surface2)",
              border: "1px solid var(--rpt-border)",
              borderRadius: 8,
              padding: "16px 20px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 20,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: "var(--rpt-brand)",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Action Thesis
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--rpt-ink)",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {data.executiveSummary}
              </p>
            </div>
            <div
              style={{
                textAlign: "right",
                borderLeft: "1px solid var(--rpt-border)",
                paddingLeft: 20,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 850,
                  color: "var(--rpt-brand-dark)",
                  lineHeight: 1,
                }}
              >
                {highPriorityCount}
              </div>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 800,
                  color: "var(--rpt-text-muted)",
                  textTransform: "uppercase",
                  marginTop: 4,
                }}
              >
                Key Initiatives
              </div>
            </div>
          </div>
        )}

        {/* Priority List */}
        <ReportSection title="Action Portfolio & Priorities">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.slice(0, 4).map((rec, idx) => (
              <div
                key={rec.id || idx}
                style={{
                  background: "var(--rpt-surface2)",
                  border: "1px solid var(--rpt-border-light)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  position: "relative",
                  overflow: "hidden",
                  paddingLeft: 20,
                }}
              >
                {/* Priority accent color tag */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 4,
                    height: "100%",
                    background: priorityColor(rec.priority),
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--rpt-brand-dark)",
                      }}
                    >
                      {rec.title}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: "var(--rpt-text-muted)",
                        marginLeft: 8,
                      }}
                    >
                      Ref: {rec.id}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <ReportBadge
                      label={rec.priority}
                      variant={rec.priority}
                      dot
                    />
                    <ReportBadge
                      label={`${Math.round(rec.confidence * 100)}% Confidence`}
                      variant="neutral"
                    />
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 10,
                    color: "var(--rpt-text)",
                    lineHeight: 1.45,
                    margin: "0 0 10px 0",
                  }}
                >
                  {rec.observation} / {rec.recommendation}
                </p>

                {/* Meta details subrow */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 12,
                    borderTop: "1px solid var(--rpt-border-light)",
                    paddingTop: 8,
                    fontSize: 8.5,
                  }}
                >
                  <div>
                    <span style={{ color: "var(--rpt-text-muted)" }}>
                      Expected Impact:{" "}
                    </span>
                    <strong style={{ color: "var(--rpt-brand-dark)" }}>
                      {rec.expectedImpact}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--rpt-text-muted)" }}>
                      Timeline:{" "}
                    </span>
                    <strong style={{ color: "var(--rpt-brand-dark)" }}>
                      {rec.timeHorizon || "Medium-term"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--rpt-text-muted)" }}>
                      Success Metric:{" "}
                    </span>
                    <strong style={{ color: "var(--rpt-brand-dark)" }}>
                      {rec.successMetric || "Operational lift"}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      </div>
    </ReportPage>
  );
}
