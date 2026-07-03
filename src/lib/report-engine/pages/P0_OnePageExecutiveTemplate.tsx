import React from "react";
import type { ReportDocument } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSummaryTile } from "../primitives/ReportSummaryTile";
import { ReportSectionHeader } from "../primitives/ReportSectionHeader";
import { ReportChart } from "../primitives/ReportChart";
import { ReportCallout } from "../primitives/ReportCallout";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportTable } from "../primitives/ReportTable";

interface Props {
  readonly doc: ReportDocument;
}

const priorityTone: Record<string, "critical" | "warning" | "success" | "info"> = {
  critical: "critical",
  high: "warning",
  medium: "info",
  low: "success",
};

export function P0_OnePageExecutiveTemplate({ doc }: Props) {
  const kpis = doc.p1.topKpis.length > 0 ? doc.p1.topKpis : doc.p2.kpis.slice(0, 4);
  const chartSpec = doc.p2.primaryCharts?.[0];
  const actions = doc.p7.recommendations.slice(0, 3);
  const insights = doc.p2.descriptiveInsights.slice(0, 3);
  const riskNote = doc.p4.notes ||
    "Review the dataset quality notes and validate assumptions before scaling recommendations.";

  const healthScore = doc.p1.businessHealthScore;
  let healthLabel = "At Risk";
  if (healthScore >= 80) {
    healthLabel = "Strong";
  } else if (healthScore >= 60) {
    healthLabel = "Stable";
  }

  return (
    <ReportPage
      pageNumber={1}
      totalPages={1}
      title="Executive One-Page Report"
      subtitle="Strategic performance snapshot with insight-driven recommendations"
      datasetName={doc.datasetName}
      generatedAt={doc.generatedAt}
    >
      <div style={{ display: "grid", gap: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.6fr",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 14,
                padding: 20,
                borderRadius: 20,
                background: "var(--rpt-surface2)",
                border: "1px solid var(--rpt-border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "var(--rpt-accent)",
                      marginBottom: 8,
                    }}
                  >
                    Strategic Snapshot
                  </div>
                  <h2 style={{ margin: 0, fontSize: 24 }}>
                    {doc.p1.reportTitle}
                  </h2>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--rpt-text-muted)",
                      marginBottom: 6,
                    }}
                  >
                    Report date
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {doc.generatedAt}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <ReportSummaryTile
                  label="Business health"
                  value={`${doc.p1.businessHealthScore}%`}
                  caption={healthLabel}
                />
                <ReportSummaryTile
                  label="Data quality"
                  value={`${doc.p1.dataQualityScore}%`}
                  caption="Completeness & trust"
                />
                <ReportSummaryTile
                  label="Rows analyzed"
                  value={doc.p1.rowCount.toLocaleString()}
                  caption="Sample size"
                />
                <ReportSummaryTile
                  label="Columns reviewed"
                  value={doc.p1.columnCount.toLocaleString()}
                  caption="Insights depth"
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {kpis.slice(0, 2).map((kpi) => (
                <ReportSummaryTile
                  key={kpi.id}
                  label={kpi.label}
                  value={kpi.formattedValue ?? String(kpi.value)}
                  caption={kpi.trend ? `${kpi.trend.direction.toUpperCase()} ${kpi.trend.pct}%` : undefined}
                />
              ))}
              {kpis.slice(2, 4).map((kpi) => (
                <ReportSummaryTile
                  key={kpi.id}
                  label={kpi.label}
                  value={kpi.formattedValue ?? String(kpi.value)}
                  caption={kpi.trend ? `${kpi.trend.direction.toUpperCase()} ${kpi.trend.pct}%` : undefined}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              padding: 20,
              borderRadius: 20,
              background: "var(--rpt-surface2)",
              border: "1px solid var(--rpt-border)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "var(--rpt-brand)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Top Focus
            </div>
            <h3 style={{ margin: 0, fontSize: 18 }}>
              {doc.p1.scqa.headline}
            </h3>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6 }}>
              {doc.p1.executiveSummary}
            </p>
            <ReportCallout
              title="Recommended action"
              text={doc.p1.scqa.recommendedAction}
              severity="success"
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 20,
          }}
        >
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              border: "1px solid var(--rpt-border)",
              background: "var(--rpt-surface2)",
            }}
          >
            <div
              style={{
                padding: "18px 20px",
                borderBottom: "1px solid var(--rpt-border)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--rpt-accent)",
                  marginBottom: 8,
                }}
              >
                Performance Trend
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                Key chart snapshot
              </div>
            </div>
            <div style={{ padding: 18, minHeight: 280 }}>
              {chartSpec ? (
                <ReportChart spec={chartSpec} height={260} />
              ) : (
                <ReportCallout
                  title="Visualization unavailable"
                  text="No primary chart is available for this dataset. Add a time series or performance chart to visualize trends here."
                />
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <ReportSectionHeader
              title="Actionable Findings"
              description="The most important insights to act on now."
            />
            {insights.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {insights.map((ins, index) => (
                  <div
                    key={ins.id ?? index}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: "var(--rpt-surface)",
                      border: "1px solid var(--rpt-border)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--rpt-brand-dark)",
                        marginBottom: 6,
                      }}
                    >
                      {ins.title}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10,
                        lineHeight: 1.5,
                        color: "var(--rpt-text-muted)",
                      }}
                    >
                      {ins.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <ReportCallout
                title="No summary insights available"
                text="The analytics engine did not produce high-confidence descriptive insights for this dataset yet."
              />
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <ReportSectionHeader
              title="Recommended Next Moves"
              description="Top priority recommendations to improve performance quickly."
            />
            <div style={{ display: "grid", gap: 12 }}>
              {actions.length > 0 ? (
                actions.map((action) => (
                  <div
                    key={action.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 12,
                      padding: 18,
                      borderRadius: 16,
                      background: "var(--rpt-surface)",
                      border: "1px solid var(--rpt-border)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          marginBottom: 6,
                        }}
                      >
                        {action.title}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10.5,
                          lineHeight: 1.55,
                          color: "var(--rpt-text-muted)",
                        }}
                      >
                        {action.recommendation}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <ReportBadge
                        label={action.priority.toUpperCase()}
                        variant={priorityTone[action.priority] ?? "info"}
                      />
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 10,
                          color: "var(--rpt-text-muted)",
                        }}
                      >
                        Effort: {action.effort}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <ReportCallout
                  title="No recommendations available"
                  text="No prescriptive recommendations were generated for this run."
                />
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <ReportSectionHeader
              title="Data Quality & Risk"
              description="Key dataset caveats and assumptions for decision-making."
            />
            <ReportCallout
              title="Dataset assurance"
              text={riskNote}
              severity="warning"
            />
          </div>

          <div>
            <ReportSectionHeader
              title="KPI Reference Table"
              description="The metrics driving this report in one place."
            />
            <ReportTable
              columns={[
                { key: "label", header: "KPI" },
                { key: "formattedValue", header: "Value", align: "right" },
                {
                  key: "trend",
                  header: "Trend",
                  align: "right",
                  render: (row: any) =>
                    row.trend ? `${row.trend.direction} ${row.trend.pct}%` : "—",
                },
              ]}
              rows={kpis.map((kpi) => ({
                label: kpi.label,
                formattedValue: kpi.formattedValue ?? String(kpi.value),
                trend: kpi.trend,
              }))}
              maxRows={6}
              striped
            />
          </div>
        </div>
      </div>
    </ReportPage>
  );
}
