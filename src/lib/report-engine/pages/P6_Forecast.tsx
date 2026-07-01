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

interface Props {
  data: P6ForecastData;
  datasetName: string;
  generatedAt: string;
}

export function P6_Forecast({ data, datasetName, generatedAt }: Props) {
  if (!data.hasForecasts) {
    return (
      <ReportPage
        pageNumber={7}
        totalPages={TOTAL_PAGES}
        title="Forecast Outlook"
        subtitle="Predictive readiness, available signals, and confidence caveats"
        datasetName={datasetName}
        generatedAt={generatedAt}
      >
        <ReportCallout
          title="Forecast Readiness"
          text="Predictive forecasting is readiness-gated until the dataset contains a recognized time field with at least 6 stable historical periods. Add governed dates and enough history to produce defensible forecast intervals."
          severity="info"
        />
        {data.predictiveInsights.length > 0 && (
          <ReportSection title="Predictive Insight Blocks">
            <div className="rpt-grid rpt-grid-2" style={{ gap: 10 }}>
              {data.predictiveInsights.slice(0, 4).map((ins) => (
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
                      fontSize: 10.5,
                      color: "var(--rpt-text-muted)",
                      lineHeight: 1.48,
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

  const primary = data.forecasts[0];

  return (
    <ReportPage
      pageNumber={7}
      totalPages={TOTAL_PAGES}
      title="Forecast Outlook"
      subtitle="Forward-looking movement, confidence intervals, assumptions, and risk controls"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      {primary && (
        <ReportSection title={`Forecast Exhibit - ${primary.measureColumn}`}>
          <div className="rpt-card">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.35fr 0.75fr",
                gap: 18,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div className="rpt-h3">{primary.measureColumn}</div>
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 10,
                        color: "var(--rpt-text-muted)",
                      }}
                    >
                      {primary.method} method
                    </div>
                  </div>
                  <ReportBadge
                    label={`${Math.round(primary.confidence * 100)}% confidence`}
                    variant="brand"
                  />
                </div>
                <div className="rpt-chart-panel">
                  <ReportChart spec={primary.chartSpec} height={230} />
                </div>
              </div>
              <div>
                <div className="rpt-grid" style={{ gap: 8 }}>
                  {[
                    { label: "Trend", value: primary.overallTrend },
                    {
                      label: "Growth",
                      value: `${primary.totalGrowthPct >= 0 ? "+" : ""}${primary.totalGrowthPct.toFixed(1)}%`,
                    },
                    { label: "Peak Period", value: primary.peakPeriod },
                    { label: "Trough Period", value: primary.troughPeriod },
                  ].map(({ label, value }) => (
                    <div key={label} className="rpt-stat-tile">
                      <div className="rpt-label">{label}</div>
                      <div className="rpt-stat-tile-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ReportSection>
      )}

      {primary?.nextPeriods.length ? (
        <ReportSection title="Projected Periods">
          <ReportTable
            columns={[
              { key: "period", header: "Period" },
              {
                key: "predicted",
                header: "Predicted",
                align: "right",
                render: (r) => fmt(Number(r.predicted)),
              },
              {
                key: "lower",
                header: "Lower CI",
                align: "right",
                render: (r) => fmt(Number(r.lower)),
              },
              {
                key: "upper",
                header: "Upper CI",
                align: "right",
                render: (r) => fmt(Number(r.upper)),
              },
            ]}
            rows={primary.nextPeriods}
          />
        </ReportSection>
      ) : null}

      {primary &&
        (primary.assumptions.length > 0 || primary.risks.length > 0) && (
          <ReportSection title="Assumptions & Risk Controls">
            <div className="rpt-grid rpt-grid-2" style={{ gap: 12 }}>
              {primary.assumptions.length > 0 && (
                <ReportBlock title="Assumptions" variant="sm">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                      marginTop: 8,
                    }}
                  >
                    {primary.assumptions.slice(0, 5).map((a, i) => (
                      <div
                        key={i}
                        className="rpt-stat-tile"
                        style={{
                          fontSize: 10.3,
                          color: "var(--rpt-text-muted)",
                        }}
                      >
                        {a}
                      </div>
                    ))}
                  </div>
                </ReportBlock>
              )}
              {primary.risks.length > 0 && (
                <ReportBlock title="Risks" variant="sm">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                      marginTop: 8,
                    }}
                  >
                    {primary.risks.slice(0, 5).map((r, i) => (
                      <div
                        key={i}
                        className="rpt-risk-block"
                        style={{
                          fontSize: 10.3,
                          color: "var(--rpt-text-muted)",
                        }}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                </ReportBlock>
              )}
            </div>
          </ReportSection>
        )}

      {data.predictiveInsights.length > 0 && (
        <ReportSection title="Predictive Insight Blocks">
          <div className="rpt-grid rpt-grid-3" style={{ gap: 10 }}>
            {data.predictiveInsights.slice(0, 3).map((ins) => (
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
