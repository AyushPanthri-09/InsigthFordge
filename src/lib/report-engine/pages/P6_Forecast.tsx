import React from "react";
import type { P6ForecastData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBlock } from "../primitives/ReportBlock";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportChart } from "../primitives/ReportChart";
import { ReportTable } from "../primitives/ReportTable";
import { ReportCallout } from "../primitives/ReportCallout";

const TOTAL_PAGES = 9;

function fmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

interface Props { data: P6ForecastData; datasetName: string; generatedAt: string; }

export function P6_Forecast({ data, datasetName, generatedAt }: Props) {
  if (!data.hasForecasts) {
    return (
      <ReportPage pageNumber={7} totalPages={TOTAL_PAGES} title="Forecast" datasetName={datasetName} generatedAt={generatedAt}>
        <ReportCallout
          title="Insufficient Data for Forecasting"
          text="Forecasting requires time-series data with at least 6 data points. Ensure the dataset contains a date column."
          severity="info"
        />
        {data.predictiveInsights.length > 0 && (
          <ReportSection title="Predictive Insights">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.predictiveInsights.map((ins) => (
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

  return (
    <ReportPage pageNumber={7} totalPages={TOTAL_PAGES} title="Forecast" datasetName={datasetName} generatedAt={generatedAt}>
      {data.forecasts.map((fc) => (
        <ReportSection key={fc.measureColumn} title={`Forecast — ${fc.measureColumn}`}>
          {/* Meta strip */}
          <div className="rpt-grid rpt-grid-4" style={{ gap: 8, marginBottom: 12 }}>
            {[
              { label: "Method",     value: fc.method },
              { label: "Confidence", value: `${Math.round(fc.confidence * 100)}%` },
              { label: "Trend",      value: fc.overallTrend },
              { label: "Growth",     value: `${fc.totalGrowthPct >= 0 ? "+" : ""}${fc.totalGrowthPct.toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "var(--rpt-surface2)", borderRadius: 8, padding: "10px 12px" }}>
                <div className="rpt-label" style={{ marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <ReportBlock variant="sm" style={{ marginBottom: 12 }}>
            <ReportChart spec={fc.chartSpec} height={180} />
          </ReportBlock>

          {/* Next periods table */}
          {fc.nextPeriods.length > 0 && (
            <ReportTable
              columns={[
                { key: "period",    header: "Period" },
                { key: "predicted", header: "Predicted", align: "right", render: (r) => fmt(Number(r.predicted)) },
                { key: "lower",     header: "Lower CI",  align: "right", render: (r) => fmt(Number(r.lower)) },
                { key: "upper",     header: "Upper CI",  align: "right", render: (r) => fmt(Number(r.upper)) },
              ]}
              rows={fc.nextPeriods as any}
            />
          )}

          {/* Assumptions & risks */}
          {(fc.assumptions.length > 0 || fc.risks.length > 0) && (
            <div className="rpt-grid rpt-grid-2" style={{ gap: 10, marginTop: 12 }}>
              {fc.assumptions.length > 0 && (
                <ReportBlock title="Assumptions" variant="sm">
                  <ul style={{ margin: "8px 0 0", padding: "0 0 0 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {fc.assumptions.map((a, i) => (
                      <li key={i} style={{ fontSize: 10, color: "var(--rpt-text-muted)" }}>{a}</li>
                    ))}
                  </ul>
                </ReportBlock>
              )}
              {fc.risks.length > 0 && (
                <ReportBlock title="Risks" variant="sm">
                  <ul style={{ margin: "8px 0 0", padding: "0 0 0 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {fc.risks.map((r, i) => (
                      <li key={i} style={{ fontSize: 10, color: "var(--rpt-text-muted)" }}>{r}</li>
                    ))}
                  </ul>
                </ReportBlock>
              )}
            </div>
          )}
        </ReportSection>
      ))}

      {data.predictiveInsights.length > 0 && (
        <ReportSection title="Predictive Insights">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.predictiveInsights.slice(0, 3).map((ins) => (
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
