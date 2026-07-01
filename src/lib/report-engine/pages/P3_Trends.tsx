import React from "react";
import type { P3TrendsData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBlock } from "../primitives/ReportBlock";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportChart } from "../primitives/ReportChart";
import { ReportCallout } from "../primitives/ReportCallout";

const TOTAL_PAGES = 9;

interface Props { data: P3TrendsData; datasetName: string; generatedAt: string; }

export function P3_Trends({ data, datasetName, generatedAt }: Props) {
  if (!data.hasTimeData) {
    return (
      <ReportPage pageNumber={4} totalPages={TOTAL_PAGES} title="Trends & Time Series" datasetName={datasetName} generatedAt={generatedAt}>
        <ReportCallout
          title="No Time-Series Data Detected"
          text="This dataset does not contain a recognised date/time column. Trend analysis requires temporal data."
          severity="info"
        />
        {data.trendCharts.length > 0 && (
          <ReportSection title="Available Charts">
            {data.trendCharts.map((c) => (
              <ReportBlock key={c.id} title={c.title} subtitle={c.description} variant="sm">
                <div style={{ marginTop: 10 }}><ReportChart spec={c} height={160} /></div>
              </ReportBlock>
            ))}
          </ReportSection>
        )}
        {data.topFindings.length > 0 && (
          <ReportSection title="Key Findings">
            <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              {data.topFindings.slice(0, 8).map((f, i) => (
                <li key={i} style={{ fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.5 }}>{f}</li>
              ))}
            </ul>
          </ReportSection>
        )}
      </ReportPage>
    );
  }

  return (
    <ReportPage pageNumber={4} totalPages={TOTAL_PAGES} title="Trends & Time Series" datasetName={datasetName} generatedAt={generatedAt}>
      {/* Time series summaries */}
      <ReportSection title="Time-Series Analysis">
        {data.timeSeriesAnalysis.map((ts) => (
          <div key={ts.measureColumn} className="rpt-card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div className="rpt-h3">{ts.measureColumn}</div>
              <ReportBadge
                label={ts.overallTrend}
                variant={ts.overallTrend === "growing" ? "success" : ts.overallTrend === "declining" ? "critical" : "neutral"}
                dot
              />
              <ReportBadge
                label={`${ts.totalGrowthPct >= 0 ? "+" : ""}${ts.totalGrowthPct.toFixed(1)}% total`}
                variant={ts.totalGrowthPct >= 0 ? "success" : "critical"}
              />
              {ts.seasonalityDetected && <ReportBadge label="Seasonal" variant="info" />}
            </div>
            <div className="rpt-grid rpt-grid-4" style={{ gap: 8, marginBottom: 12 }}>
              {[
                { label: "Peak Period",   value: ts.peakPeriod },
                { label: "Trough Period", value: ts.troughPeriod },
                { label: "Granularity",   value: ts.granularity },
                { label: "Data Points",   value: String(ts.periods.length) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "var(--rpt-surface2)", borderRadius: 8, padding: "10px 12px" }}>
                  <div className="rpt-label" style={{ marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
            {ts.narrative && (
              <div style={{ fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.6 }}>{ts.narrative}</div>
            )}
          </div>
        ))}
      </ReportSection>

      {/* Trend charts */}
      {data.trendCharts.length > 0 && (
        <ReportSection title="Trend Charts">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.trendCharts.slice(0, 2).map((c) => (
              <ReportBlock key={c.id} title={c.title} subtitle={c.description} variant="sm">
                <div style={{ marginTop: 10 }}><ReportChart spec={c} height={160} /></div>
                {c.insight && <div style={{ marginTop: 8, fontSize: 10, color: "var(--rpt-text-muted)" }}>{c.insight}</div>}
              </ReportBlock>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Diagnostic insights */}
      {data.diagnosticInsights.length > 0 && (
        <ReportSection title="Diagnostic Insights">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.diagnosticInsights.slice(0, 3).map((ins) => (
              <div key={ins.id} className="rpt-card-sm">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div className="rpt-h3">{ins.title}</div>
                  <ReportBadge label={`${Math.round(ins.confidence * 100)}%`} variant="brand" />
                </div>
                <div style={{ fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.5 }}>{ins.summary}</div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}
    </ReportPage>
  );
}
