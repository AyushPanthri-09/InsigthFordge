import React from "react";
import type { P6ForecastData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBlock } from "../primitives/ReportBlock";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportChart } from "../primitives/ReportChart";
import { ReportTable } from "../primitives/ReportTable";
import { ReportCallout } from "../primitives/ReportCallout";

interface Props {
  data: P6ForecastData;
  datasetName: string;
  generatedAt: string;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

export function P6_Forecast({ data, datasetName, generatedAt }: Props) {
  if (!data.hasForecasts) {
    return (
      <ReportPage
        pageNumber={11}
        totalPages={13}
        title="Forecasting Outlook"
        subtitle="Predictive model simulations, demand forecasts, and confidence margins"
        datasetName={datasetName}
        generatedAt={generatedAt}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ReportCallout
            title="Forecast Model Simulation"
            text="Time-series forecasting is currently configured with simulated seasonal iterations because the uploaded dataset lacks a sequential timeline (e.g. daily/monthly records). Add a chronological time field to train an ARIMA or SES model."
            severity="info"
          />
          {data.predictiveInsights.length > 0 && (
            <ReportSection title="Predictive AI Explanations">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {data.predictiveInsights.slice(0, 4).map((ins) => (
                  <div key={ins.id} className="rpt-ai-block" style={{ padding: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 750,
                          color: "var(--rpt-brand-dark)",
                        }}
                      >
                        {ins.title}
                      </span>
                      <ReportBadge label="Simulation" variant="brand" />
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
        </div>
      </ReportPage>
    );
  }

  const primary = data.forecasts[0];
  const tableRows = primary
    ? primary.nextPeriods.map((p, idx) => ({
        id: idx,
        period: p.period,
        predicted: fmt(p.predicted),
        lower: fmt(p.lower),
        upper: fmt(p.upper),
      }))
    : [];

  return (
    <ReportPage
      pageNumber={11}
      totalPages={13}
      title="Forecasting Outlook"
      subtitle="Forward-looking model estimations, demand forecasting, and predictive confidence intervals"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {primary && (
          <div className="rpt-exec-insight">
            <div className="rpt-exec-insight-label">Executive Insight</div>
            <p>
              Forecasting is expected to grow steadily over the next modeled periods with{" "}
              {primary.confidence >= 0.9 ? "high" : "moderate"} confidence. The model projects a{" "}
              {primary.totalGrowthPct >= 0 ? "positive" : "negative"} growth outlook of{" "}
              {primary.totalGrowthPct.toFixed(1)}%.
            </p>
          </div>
        )}

        {primary && (
          <ReportSection title={`Forecast Target Exhibit: ${primary.measureColumn}`}>
            <div className="rpt-card" style={{ padding: 14 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.3fr 0.7fr",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--rpt-brand-dark)",
                      }}
                    >
                      Projections Graph ({primary.method})
                    </span>
                    <ReportBadge
                      label={`${Math.round(primary.confidence * 100)}% Confidence`}
                      variant="success"
                      dot
                    />
                  </div>
                  <div className="rpt-chart-panel" style={{ height: 160 }}>
                    <ReportChart spec={primary.chartSpec} height={160} />
                  </div>
                </div>

                <div
                  style={{
                    borderLeft: "1px solid var(--rpt-border)",
                    paddingLeft: 16,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
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
                      Model Summary
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "var(--rpt-brand-dark)",
                        marginBottom: 4,
                      }}
                    >
                      Trend Direction: {primary.overallTrend.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--rpt-text-muted)",
                        marginBottom: 12,
                      }}
                    >
                      Growth shift of {primary.totalGrowthPct.toFixed(1)}% expected.
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        background: "var(--rpt-surface2)",
                        borderRadius: 4,
                        padding: "6px 10px",
                        border: "1px solid var(--rpt-border-light)",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: 7.5,
                          color: "var(--rpt-text-muted)",
                        }}
                      >
                        Peak Period
                      </span>
                      <strong style={{ fontSize: 9.5 }}>{primary.peakPeriod}</strong>
                    </div>
                    <div
                      style={{
                        background: "var(--rpt-surface2)",
                        borderRadius: 4,
                        padding: "6px 10px",
                        border: "1px solid var(--rpt-border-light)",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: 7.5,
                          color: "var(--rpt-text-muted)",
                        }}
                      >
                        Trough Period
                      </span>
                      <strong style={{ fontSize: 9.5 }}>{primary.troughPeriod}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ReportSection>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 14,
          }}
        >
          {primary && tableRows.length > 0 && (
            <ReportSection title="Future Values Register">
              <ReportTable
                columns={[
                  { key: "period", header: "Period", mono: true },
                  { key: "predicted", header: "Predicted", align: "right" },
                  {
                    key: "lower",
                    header: "Lower Limit (95%)",
                    align: "right",
                    mono: true,
                  },
                  {
                    key: "upper",
                    header: "Upper Limit (95%)",
                    align: "right",
                    mono: true,
                  },
                ]}
                rows={tableRows}
                maxRows={5}
              />
            </ReportSection>
          )}

          {primary && primary.assumptions.length > 0 && (
            <ReportSection title="Forecast Assumptions & Risks">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    background: "var(--rpt-surface2)",
                    border: "1px solid var(--rpt-border)",
                    borderRadius: 6,
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: "var(--rpt-accent)",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Model Assumptions
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 12,
                      fontSize: 9,
                      color: "var(--rpt-text-muted)",
                      lineHeight: 1.4,
                    }}
                  >
                    {primary.assumptions.slice(0, 2).map((item, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    background: "var(--rpt-surface2)",
                    border: "1px solid var(--rpt-border)",
                    borderRadius: 6,
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: "var(--rpt-critical)",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Forecast Risks
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 12,
                      fontSize: 9,
                      color: "var(--rpt-text-muted)",
                      lineHeight: 1.4,
                    }}
                  >
                    {primary.risks.slice(0, 2).map((item, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ReportSection>
          )}
        </div>
      </div>
    </ReportPage>
  );
}
