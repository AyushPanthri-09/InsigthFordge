import React from "react";
import type { P2PerformanceData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportGrid } from "../primitives/ReportGrid";
import { ReportBlock } from "../primitives/ReportBlock";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportChart } from "../primitives/ReportChart";

const TOTAL_PAGES = 9;

function fmt(v: number | string): string {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

interface Props {
  data: P2PerformanceData;
  datasetName: string;
  generatedAt: string;
}

export function P2_Performance({ data, datasetName, generatedAt }: Props) {
  const heroChart = data.primaryCharts[0];
  const supportingCharts = data.primaryCharts.slice(1, 3);

  return (
    <ReportPage
      pageNumber={3}
      totalPages={TOTAL_PAGES}
      title="Performance Command Center"
      subtitle={`KPI posture, driver relationships, and descriptive AI insights for ${data.domain}`}
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <ReportSection title="Metric Scoreboard">
        <div className="rpt-grid rpt-grid-4" style={{ gap: 10 }}>
          {data.kpis.slice(0, 8).map((k) => {
            const trendClass =
              k.trend?.direction === "up"
                ? "rpt-kpi-trend-up"
                : k.trend?.direction === "down"
                  ? "rpt-kpi-trend-down"
                  : "rpt-kpi-trend-flat";
            return (
              <div key={k.id} className="rpt-kpi">
                <div className="rpt-kpi-label">{k.label}</div>
                <div className="rpt-kpi-value">{fmt(k.value)}</div>
                {k.unit && <div className="rpt-kpi-sub">{k.unit}</div>}
                {k.trend !== undefined && (
                  <div className={trendClass}>
                    {k.trend.direction === "up"
                      ? "UP"
                      : k.trend.direction === "down"
                        ? "DOWN"
                        : "FLAT"}{" "}
                    {Math.abs(k.trend.pct).toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ReportSection>

      {heroChart && (
        <ReportSection title="Primary Performance Exhibit">
          <div
            className="rpt-card"
            style={{
              display: "grid",
              gridTemplateColumns: "1.45fr 0.85fr",
              gap: 18,
              alignItems: "stretch",
            }}
          >
            <div>
              <div className="rpt-h3">{heroChart.title}</div>
              {heroChart.description && (
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 10,
                    color: "var(--rpt-text-muted)",
                  }}
                >
                  {heroChart.description}
                </div>
              )}
              <div className="rpt-chart-panel" style={{ marginTop: 12 }}>
                <ReportChart spec={heroChart} height={235} />
              </div>
            </div>
            <div className="rpt-ai-block">
              <div className="rpt-label" style={{ marginBottom: 8 }}>
                AI interpretation
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--rpt-ink)",
                  lineHeight: 1.55,
                }}
              >
                {heroChart.insight ??
                  "Performance exhibit prepared for executive review. Use the KPI and correlation panels to isolate the drivers behind this movement."}
              </div>
            </div>
          </div>
        </ReportSection>
      )}

      {supportingCharts.length > 0 && (
        <ReportSection title="Supporting Views">
          <ReportGrid cols={2} gap={12}>
            {supportingCharts.map((c) => (
              <ReportBlock
                key={c.id}
                title={c.title}
                subtitle={c.description}
                variant="sm"
              >
                <div className="rpt-chart-panel" style={{ marginTop: 10 }}>
                  <ReportChart spec={c} height={150} />
                </div>
                {c.insight && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 10,
                      color: "var(--rpt-text-muted)",
                      lineHeight: 1.45,
                    }}
                  >
                    {c.insight}
                  </div>
                )}
              </ReportBlock>
            ))}
          </ReportGrid>
        </ReportSection>
      )}

      <div className="rpt-grid rpt-grid-2" style={{ gap: 14 }}>
        {data.correlations.length > 0 && (
          <ReportSection title="Driver Signals">
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {data.correlations.slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  className="rpt-card-sm"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 48px",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--rpt-font-mono)",
                        fontSize: 9.5,
                        color: "var(--rpt-text-muted)",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {c.a}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--rpt-font-mono)",
                        fontSize: 9.5,
                        color: "var(--rpt-text-muted)",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {c.b}
                    </div>
                  </div>
                  <ReportBadge
                    label={c.strength}
                    variant={
                      c.strength === "strong"
                        ? "success"
                        : c.strength === "moderate"
                          ? "info"
                          : "neutral"
                    }
                  />
                  <div
                    style={{
                      fontFamily: "var(--rpt-font-mono)",
                      fontSize: 14,
                      fontWeight: 850,
                      textAlign: "right",
                      color: "var(--rpt-ink)",
                    }}
                  >
                    {c.r.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {data.descriptiveInsights.length > 0 && (
          <ReportSection title="AI Insight Blocks">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.descriptiveInsights.slice(0, 4).map((ins) => (
                <div key={ins.id} className="rpt-ai-block">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 5,
                    }}
                  >
                    <div className="rpt-h3">{ins.title}</div>
                    <ReportBadge
                      label={`${Math.round(ins.confidence * 100)}% confidence`}
                      variant="brand"
                    />
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
      </div>
    </ReportPage>
  );
}
