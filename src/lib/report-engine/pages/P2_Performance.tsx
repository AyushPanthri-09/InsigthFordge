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

interface Props { data: P2PerformanceData; datasetName: string; generatedAt: string; }

export function P2_Performance({ data, datasetName, generatedAt }: Props) {
  return (
    <ReportPage
      pageNumber={3}
      totalPages={TOTAL_PAGES}
      title="Performance Dashboard"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      {/* KPI grid */}
      <ReportSection title="Key Performance Indicators">
        <div className="rpt-grid rpt-grid-4" style={{ gap: 10 }}>
          {data.kpis.slice(0, 8).map((k) => (
            <div key={k.id} className="rpt-kpi">
              <div className="rpt-kpi-label">{k.label}</div>
              <div className="rpt-kpi-value">{fmt(k.value)}</div>
              {k.unit && <div className="rpt-kpi-sub">{k.unit}</div>}
              {k.trend !== undefined && (
                <div className={k.trend.direction === "up" ? "rpt-kpi-trend-up" : k.trend.direction === "down" ? "rpt-kpi-trend-down" : ""} style={{ fontSize: 10, fontWeight: 700 }}>
                  {k.trend.direction === "up" ? "▲" : k.trend.direction === "down" ? "▼" : "—"} {Math.abs(k.trend.pct).toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Primary charts */}
      {data.primaryCharts.length > 0 && (
        <ReportSection title="Primary Charts">
          <ReportGrid cols={2} gap={12}>
            {data.primaryCharts.slice(0, 4).map((c) => (
              <ReportBlock key={c.id} title={c.title} subtitle={c.description} variant="sm">
                <div style={{ marginTop: 10 }}>
                  <ReportChart spec={c} height={160} />
                </div>
                {c.insight && (
                  <div style={{ marginTop: 8, fontSize: 10, color: "var(--rpt-text-muted)", lineHeight: 1.5 }}>
                    {c.insight}
                  </div>
                )}
              </ReportBlock>
            ))}
          </ReportGrid>
        </ReportSection>
      )}

      {/* Correlations */}
      {data.correlations.length > 0 && (
        <ReportSection title="Correlation Analysis">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.correlations.slice(0, 6).map((c, i) => (
              <div key={i} className="rpt-card-sm" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, fontSize: 11 }}>
                  <span style={{ fontFamily: "var(--rpt-font-mono)", fontSize: 10, color: "var(--rpt-text-muted)" }}>{c.a}</span>
                  <span style={{ margin: "0 8px", color: "var(--rpt-text-faint)" }}>↔</span>
                  <span style={{ fontFamily: "var(--rpt-font-mono)", fontSize: 10, color: "var(--rpt-text-muted)" }}>{c.b}</span>
                </div>
                <ReportBadge
                  label={c.strength}
                  variant={c.strength === "strong" ? "success" : c.strength === "moderate" ? "info" : "neutral"}
                />
                <div style={{ fontFamily: "var(--rpt-font-mono)", fontSize: 13, fontWeight: 700, minWidth: 40, textAlign: "right" }}>
                  {c.r.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Descriptive insights */}
      {data.descriptiveInsights.length > 0 && (
        <ReportSection title="Descriptive Insights">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.descriptiveInsights.slice(0, 4).map((ins) => (
              <div key={ins.id} className="rpt-card-sm">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
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
