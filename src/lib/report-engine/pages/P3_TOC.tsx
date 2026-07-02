import React from "react";
import type { P1ExecutiveData, P2PerformanceData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportChart } from "../primitives/ReportChart";

interface Props {
  datasetName: string;
  generatedAt: string;
  executiveData?: P1ExecutiveData;
  performanceData?: P2PerformanceData;
}

function kpiIcon(index: number): string {
  return ["UP", "OR", "CU", "$", "GR", "%"][index % 6];
}

export function P3_TOC({ datasetName, generatedAt, executiveData, performanceData }: Props) {
  const topKpis = executiveData?.topKpis?.slice(0, 6) ?? [];
  const recommendations = executiveData?.topRecommendations?.slice(0, 4) ?? [];
  const primaryChart = performanceData?.primaryCharts?.[0];

  return (
    <ReportPage
      pageNumber={3}
      totalPages={11}
      title="Executive Summary (Cont.)"
      subtitle="Top performance indicators, priority recommendations, and first-look trend exhibit"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <ReportSection title="Top KPIs">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topKpis.map((kpi, index) => (
                <div
                  key={kpi.id || index}
                  className="rpt-mini-metric"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "34px 1fr auto",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: "var(--rpt-brand-soft)",
                      color: "var(--rpt-brand)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      fontWeight: 900,
                    }}
                  >
                    {kpiIcon(index)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="rpt-mini-metric-label">{kpi.label}</div>
                    <div style={{ fontSize: 8.5, color: "var(--rpt-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {kpi.rationale}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "var(--rpt-brand-dark)", fontVariantNumeric: "tabular-nums" }}>
                    {kpi.formattedValue}
                  </div>
                </div>
              ))}
              {topKpis.length === 0 && (
                <div className="rpt-card-sm" style={{ color: "var(--rpt-text-muted)", fontSize: 10 }}>
                  No KPI records were available for this dataset.
                </div>
              )}
            </div>
          </ReportSection>

          <ReportSection title="Top Recommendations">
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {recommendations.map((rec, index) => (
                <div key={`${rec.title}-${index}`} className="rpt-numbered-action">
                  <div className="rpt-numbered-action-index">{index + 1}</div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 850, color: "var(--rpt-brand-dark)", marginBottom: 3 }}>
                      {rec.title}
                    </div>
                    <p style={{ margin: 0, fontSize: 8.8, lineHeight: 1.42, color: "var(--rpt-text-muted)" }}>
                      {rec.summary}
                    </p>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <ReportBadge label={`${rec.priority} impact`} variant={rec.priority} />
                      <ReportBadge label={`${rec.effort} effort`} variant="neutral" />
                    </div>
                  </div>
                </div>
              ))}
              {recommendations.length === 0 && (
                <div className="rpt-card-sm" style={{ color: "var(--rpt-text-muted)", fontSize: 10 }}>
                  Recommendation generation did not return prioritized actions.
                </div>
              )}
            </div>
          </ReportSection>
        </div>

        {primaryChart && (
          <ReportSection title={`Key Chart: ${primaryChart.title}`}>
            <div className="rpt-card" style={{ padding: 14 }}>
              <div className="rpt-chart-panel">
                <ReportChart spec={primaryChart} height={260} />
              </div>
              {primaryChart.description && (
                <div style={{ marginTop: 7, fontSize: 8.8, color: "var(--rpt-text-muted)" }}>
                  Source: {primaryChart.description}
                </div>
              )}
            </div>
          </ReportSection>
        )}

        {executiveData && (
          <div className="rpt-exec-insight">
            <div className="rpt-exec-insight-label">Key takeaway</div>
            <p>{executiveData.scqa.recommendedAction || executiveData.executiveSummary}</p>
          </div>
        )}
      </div>
    </ReportPage>
  );
}
