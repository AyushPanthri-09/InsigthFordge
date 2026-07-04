import React from "react";
import type { P3TrendsData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportChart } from "../primitives/ReportChart";
import { ReportExecutiveInsight } from "../primitives/ReportExecutiveInsight";
import { ReportSummaryTile } from "../primitives/ReportSummaryTile";
import { ReportInsightCard } from "../primitives/ReportInsightCard";
import { ReportSectionHeader } from "../primitives/ReportSectionHeader";
import { ReportEvidencePanel } from "../primitives/ReportEvidencePanel";
import { ReportSection } from "../primitives/ReportSection";
import { ReportCallout } from "../primitives/ReportCallout";
import { ReportBadge } from "../primitives/ReportBadge";

interface Props {
  data: P3TrendsData;
  datasetName: string;
  generatedAt: string;
}

export function P6_Trends({ data, datasetName, generatedAt }: Props) {
  if (!data.hasTimeData) {
    return (
      <ReportPage
        pageNumber={6}
        totalPages={13}
        title="Trend Analysis"
        subtitle="Temporal trend detection, seasonal components, and evidence-backed findings"
        datasetName={datasetName}
        generatedAt={generatedAt}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ReportCallout
            title="Trend Readiness Information"
            text="Temporal analysis is currently run using proxy features because the dataset does not contain an explicit date or timestamp. To unlock full-grade seasonal decomposition and moving averages, please configure a column with calendar dates."
            severity="info"
          />

          {data.trendCharts.length > 0 && (
            <ReportSection title="Historical Trend Proxies">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 0.8fr",
                  gap: 14,
                }}
              >
                <div className="rpt-card" style={{ padding: 14 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--rpt-brand-dark)",
                      marginBottom: 8,
                    }}
                  >
                    {data.trendCharts[0].title}
                  </div>
                  <div className="rpt-chart-panel">
                    <ReportChart spec={data.trendCharts[0]} height={180} />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.diagnosticInsights.slice(0, 2).map((ins, i) => (
                    <div
                      key={i}
                      className="rpt-ai-block"
                      style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 10.5,
                            fontWeight: 750,
                            color: "var(--rpt-brand-dark)",
                            marginBottom: 4,
                          }}
                        >
                          {ins.title}
                        </div>
                        <p
                          style={{
                            fontSize: 9.2,
                            color: "var(--rpt-text-muted)",
                            lineHeight: 1.45,
                            margin: 0,
                          }}
                        >
                          {ins.summary}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ReportSection>
          )}

          {data.topFindings.length > 0 && (
            <ReportSection title="Key Trend Observations">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {data.topFindings.slice(0, 4).map((f, i) => (
                  <div key={i} className="rpt-card-sm" style={{ padding: 10 }}>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: "var(--rpt-brand)",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Observation {i + 1}
                    </div>
                    <p
                      style={{
                        fontSize: 9.8,
                        color: "var(--rpt-text-muted)",
                        lineHeight: 1.4,
                        margin: 0,
                      }}
                    >
                      {f}
                    </p>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}
        </div>
      </ReportPage>
    );
  }

  const primary = data.timeSeriesAnalysis[0];

  return (
    <ReportPage
      pageNumber={6}
      totalPages={13}
      title="Trend Analysis"
      subtitle="Time-series movement, inflection points, seasonality, and moving averages"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {primary && (
          <>
            <div className="rpt-exec-insight">
              <div className="rpt-exec-insight-label">Executive Insight</div>
              <p>
                {primary.narrative ||
                  `The monitored measure shows a ${primary.overallTrend} trend with ${primary.totalGrowthPct.toFixed(1)}% total growth across the available periods.`}
              </p>
            </div>
            <div
              style={{
                background: "var(--rpt-surface2)",
                border: "1px solid var(--rpt-border)",
                borderRadius: 8,
                padding: 16,
                display: "grid",
                gridTemplateColumns: "1fr 180px",
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
                  Detected Time-Series Trend
                </div>
                <div className="rpt-h2" style={{ marginBottom: 6 }}>
                  Overall Trend: {primary.overallTrend.toUpperCase()}
                </div>
                <p
                  style={{
                    fontSize: 10,
                    color: "var(--rpt-text-muted)",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  Analysis detects a total growth shift of {primary.totalGrowthPct.toFixed(1)}%
                  across monitored periods. The peak level was reached in {primary.peakPeriod} and
                  the lowest inflection point was registered in {primary.troughPeriod}.
                </p>
              </div>
              <div
                style={{
                  borderLeft: "1px solid var(--rpt-border)",
                  paddingLeft: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 9, color: "var(--rpt-text-muted)" }}>Seasonality:</span>
                  <ReportBadge
                    label={primary.seasonalityDetected ? "Detected" : "None"}
                    variant={primary.seasonalityDetected ? "success" : "neutral"}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 9, color: "var(--rpt-text-muted)" }}>MA Period:</span>
                  <span style={{ fontSize: 10, fontWeight: 700 }}>5-Period</span>
                </div>
              </div>
            </div>
          </>
        )}

        {data.trendCharts.length > 0 && (
          <ReportSection title="Decomposed Trend Exhibits">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {data.trendCharts.slice(0, 2).map((c) => (
                <div key={c.id} className="rpt-card" style={{ padding: 12 }}>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "var(--rpt-brand-dark)",
                      marginBottom: 6,
                    }}
                  >
                    {c.title}
                  </div>
                  <div className="rpt-chart-panel" style={{ height: 130 }}>
                    <ReportChart spec={c} height={130} />
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 14,
          }}
        >
          {data.diagnosticInsights.length > 0 && (
            <ReportSection title="AI Trend Interpretations">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.diagnosticInsights.slice(0, 3).map((ins) => (
                  <div key={ins.id} className="rpt-ai-block" style={{ padding: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 750,
                          color: "var(--rpt-brand-dark)",
                        }}
                      >
                        {ins.title}
                      </div>
                      <ReportBadge label="Diagnostic" variant="info" />
                    </div>
                    <p
                      style={{
                        fontSize: 9.2,
                        color: "var(--rpt-text-muted)",
                        lineHeight: 1.4,
                        margin: 0,
                      }}
                    >
                      {ins.summary}
                    </p>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          {data.topFindings.length > 0 && (
            <ReportSection title="Operational Action Notes">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.topFindings.slice(0, 3).map((finding, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--rpt-surface2)",
                      border: "1px solid var(--rpt-border-light)",
                      borderRadius: 6,
                      padding: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: "var(--rpt-brand)",
                        textTransform: "uppercase",
                        marginBottom: 3,
                      }}
                    >
                      Trend Signal {idx + 1}
                    </div>
                    <p
                      style={{
                        fontSize: 9.5,
                        color: "var(--rpt-text-muted)",
                        lineHeight: 1.4,
                        margin: 0,
                      }}
                    >
                      {finding}
                    </p>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}
        </div>
      </div>
    </ReportPage>
  );
}
