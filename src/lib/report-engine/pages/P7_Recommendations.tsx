import React from "react";
import type { P7RecommendationsData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBadge } from "../primitives/ReportBadge";

const TOTAL_PAGES = 9;

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

interface Props {
  data: P7RecommendationsData;
  datasetName: string;
  generatedAt: string;
}

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
  const criticalCount = sorted.filter(
    (r) => r.priority === "critical" || r.priority === "high",
  ).length;

  return (
    <ReportPage
      pageNumber={8}
      totalPages={TOTAL_PAGES}
      title="Executive Action Plan"
      subtitle="Prioritized recommendations with impact, risk, owner-ready success measures, and confidence"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      {data.executiveSummary && (
        <div
          className="rpt-card-accent"
          style={{
            marginBottom: 22,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 20,
          }}
        >
          <div>
            <div className="rpt-label" style={{ marginBottom: 7 }}>
              Action thesis
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--rpt-text-muted)",
                lineHeight: 1.62,
              }}
            >
              {data.executiveSummary}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 850,
                color: "var(--rpt-ink)",
                lineHeight: 1,
              }}
            >
              {criticalCount}
            </div>
            <div className="rpt-label" style={{ marginTop: 5 }}>
              High-priority moves
            </div>
          </div>
        </div>
      )}

      <ReportSection title="Prioritized Recommendation Portfolio">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sorted.slice(0, 5).map((rec, i) => (
            <div
              key={rec.id}
              className="rpt-card"
              style={{
                position: "relative",
                overflow: "hidden",
                paddingLeft: 22,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 6,
                  background: priorityColor(rec.priority),
                }}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "34px 1fr",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "var(--rpt-surface2)",
                    color: "var(--rpt-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div className="rpt-h3" style={{ fontSize: 13 }}>
                        {rec.title}
                      </div>
                      {rec.observation && (
                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 10.5,
                            color: "var(--rpt-text-muted)",
                            lineHeight: 1.45,
                          }}
                        >
                          {rec.observation}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 5,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                        minWidth: 190,
                      }}
                    >
                      <ReportBadge
                        label={rec.priority}
                        variant={rec.priority}
                        dot
                      />
                      <ReportBadge
                        label={`${rec.effort} effort`}
                        variant="neutral"
                      />
                      <ReportBadge
                        label={`${Math.round(rec.confidence * 100)}% confidence`}
                        variant="brand"
                      />
                    </div>
                  </div>

                  <div className="rpt-ai-block" style={{ marginBottom: 10 }}>
                    <div className="rpt-label" style={{ marginBottom: 4 }}>
                      Recommended action
                    </div>
                    <div
                      style={{
                        fontSize: 11.3,
                        color: "var(--rpt-ink)",
                        lineHeight: 1.48,
                      }}
                    >
                      {rec.recommendation}
                    </div>
                  </div>

                  <div className="rpt-grid rpt-grid-3" style={{ gap: 8 }}>
                    {[
                      {
                        label: "Expected Impact",
                        text: rec.expectedImpact,
                        cls: "rpt-stat-tile",
                      },
                      {
                        label: "Risk of Inaction",
                        text: rec.riskOfInaction,
                        cls: "rpt-risk-block",
                      },
                      {
                        label: "Success Metric",
                        text: rec.successMetric,
                        cls: "rpt-stat-tile",
                      },
                    ].map(({ label, text, cls }) => (
                      <div key={label} className={cls}>
                        <div className="rpt-label" style={{ marginBottom: 4 }}>
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: 9.8,
                            color: "var(--rpt-text-muted)",
                            lineHeight: 1.4,
                          }}
                        >
                          {text}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <ReportBadge label={rec.timeHorizon} variant="info" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ReportSection>
    </ReportPage>
  );
}
