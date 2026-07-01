import React from "react";
import type { P3TrendsData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBlock } from "../primitives/ReportBlock";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportChart } from "../primitives/ReportChart";
import { ReportCallout } from "../primitives/ReportCallout";

const TOTAL_PAGES = 9;

interface Props {
  data: P3TrendsData;
  datasetName: string;
  generatedAt: string;
}

export function P3_Trends({ data, datasetName, generatedAt }: Props) {
  if (!data.hasTimeData) {
    return (
      <ReportPage
        pageNumber={4}
        totalPages={TOTAL_PAGES}
        title="Trend Intelligence"
        subtitle="Temporal readiness, available trend proxies, and evidence-backed findings"
        datasetName={datasetName}
        generatedAt={generatedAt}
      >
        <ReportCallout
          title="Trend Readiness"
          text="Temporal analysis is readiness-gated because the dataset does not contain a recognized date, period, or timestamp field. Add a governed time column with stable cadence to unlock forecast-grade trend analysis."
          severity="info"
        />

        {data.trendCharts.length > 0 && (
          <ReportSection title="Available Trend Proxies">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.trendCharts.slice(0, 3).map((c) => (
                <ReportBlock
                  key={c.id}
                  title={c.title}
                  subtitle={c.description}
                  variant="sm"
                >
                  <div className="rpt-chart-panel" style={{ marginTop: 10 }}>
                    <ReportChart spec={c} height={170} />
                  </div>
                </ReportBlock>
              ))}
            </div>
          </ReportSection>
        )}

        {data.topFindings.length > 0 && (
          <ReportSection title="Key Findings">
            <div className="rpt-grid rpt-grid-2" style={{ gap: 10 }}>
              {data.topFindings.slice(0, 6).map((f, i) => (
                <div key={i} className="rpt-card-sm">
                  <div className="rpt-label" style={{ marginBottom: 5 }}>
                    Finding {i + 1}
                  </div>
                  <div
                    style={{
                      fontSize: 10.8,
                      color: "var(--rpt-text-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {f}
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>
        )}
      </ReportPage>
    );
  }

  const primary = data.timeSeriesAnalysis[0];

  return (
    <ReportPage
      pageNumber={4}
      totalPages={TOTAL_PAGES}
      title="Trend Intelligence"
      subtitle="Time-series movement, inflection points, seasonality, and diagnostic signals"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      {primary && (
        <ReportSection title="Executive Trend Posture">
          <div
            className="rpt-card-accent"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 20,
              alignItems: "center",
            }}
          >
            <div>
              <div className="rpt-h2">{primary.measureColumn}</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "var(--rpt-text-muted)",
                  lineHeight: 1.55,
                }}
              >
                {primary.narrative}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 7,
              }}
            >
              <ReportBadge
                label={primary.overallTrend}
                variant={
                  primary.overallTrend === "growing"
                    ? "success"
                    : primary.overallTrend === "declining"
                      ? "critical"
                      : "neutral"
                }
                dot
              />
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 850,
                  color:
                    primary.totalGrowthPct >= 0
                      ? "var(--rpt-success)"
                      : "var(--rpt-critical)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {primary.totalGrowthPct >= 0 ? "+" : ""}
                {primary.totalGrowthPct.toFixed(1)}%
              </div>
              <div className="rpt-label">Total growth</div>
            </div>
          </div>
        </ReportSection>
      )}

      <ReportSection title="Time-Series Signals">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.timeSeriesAnalysis.slice(0, 3).map((ts) => (
            <div key={ts.measureColumn} className="rpt-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div className="rpt-h3">{ts.measureColumn}</div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 10,
                      color: "var(--rpt-text-muted)",
                    }}
                  >
                    {ts.granularity} cadence / {ts.periods.length} periods
                    analyzed
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <ReportBadge
                    label={ts.overallTrend}
                    variant={
                      ts.overallTrend === "growing"
                        ? "success"
                        : ts.overallTrend === "declining"
                          ? "critical"
                          : "neutral"
                    }
                    dot
                  />
                  <ReportBadge
                    label={`${ts.totalGrowthPct >= 0 ? "+" : ""}${ts.totalGrowthPct.toFixed(1)}%`}
                    variant={ts.totalGrowthPct >= 0 ? "success" : "critical"}
                  />
                  {ts.seasonalityDetected && (
                    <ReportBadge label="Seasonal" variant="info" />
                  )}
                </div>
              </div>
              <div className="rpt-grid rpt-grid-4" style={{ gap: 8 }}>
                {[
                  { label: "Peak Period", value: ts.peakPeriod },
                  { label: "Trough Period", value: ts.troughPeriod },
                  { label: "Granularity", value: ts.granularity },
                  { label: "Data Points", value: String(ts.periods.length) },
                ].map(({ label, value }) => (
                  <div key={label} className="rpt-stat-tile">
                    <div className="rpt-label">{label}</div>
                    <div className="rpt-stat-tile-value">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ReportSection>

      {data.trendCharts.length > 0 && (
        <ReportSection title="Trend Exhibits">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.trendCharts.slice(0, 2).map((c) => (
              <ReportBlock
                key={c.id}
                title={c.title}
                subtitle={c.description}
                variant="sm"
              >
                <div className="rpt-chart-panel" style={{ marginTop: 10 }}>
                  <ReportChart spec={c} height={170} />
                </div>
                {c.insight && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 10.5,
                      color: "var(--rpt-text-muted)",
                      lineHeight: 1.45,
                    }}
                  >
                    {c.insight}
                  </div>
                )}
              </ReportBlock>
            ))}
          </div>
        </ReportSection>
      )}

      {data.diagnosticInsights.length > 0 && (
        <ReportSection title="Diagnostic Insight Blocks">
          <div className="rpt-grid rpt-grid-3" style={{ gap: 10 }}>
            {data.diagnosticInsights.slice(0, 3).map((ins) => (
              <div key={ins.id} className="rpt-ai-block">
                <ReportBadge
                  label={`${Math.round(ins.confidence * 100)}% confidence`}
                  variant="brand"
                />
                <div
                  className="rpt-h3"
                  style={{ marginTop: 9, marginBottom: 5 }}
                >
                  {ins.title}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--rpt-text-muted)",
                    lineHeight: 1.45,
                  }}
                >
                  {ins.summary}
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}
    </ReportPage>
  );
}
