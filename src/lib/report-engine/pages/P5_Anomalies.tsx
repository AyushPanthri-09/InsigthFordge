import React from "react";
import type { P5AnomaliesData } from "../types";
import type { RootCauseNode } from "@/services/analytics/types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBlock } from "../primitives/ReportBlock";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportTable } from "../primitives/ReportTable";
import { ReportCallout } from "../primitives/ReportCallout";

const TOTAL_PAGES = 9;

interface Props { data: P5AnomaliesData; datasetName: string; generatedAt: string; }

export function P5_Anomalies({ data, datasetName, generatedAt }: Props) {
  return (
    <ReportPage pageNumber={6} totalPages={TOTAL_PAGES} title="Anomalies & Root Cause" datasetName={datasetName} generatedAt={generatedAt}>

      {/* Anomaly columns */}
      {data.anomalyColumns.length > 0 ? (
        <ReportSection title="Anomaly Detection">
          <ReportTable
            columns={[
              { key: "column",            header: "Column",       mono: true },
              { key: "anomalyCount",      header: "Anomalies",    align: "right" },
              { key: "distributionShape", header: "Distribution" },
              { key: "zScoreThreshold",   header: "Z-Threshold",  align: "right",
                render: (r) => String(Number(r.zScoreThreshold).toFixed(1)) },
              { key: "explanation",       header: "Explanation",
                render: (r) => <span style={{ fontSize: 10, color: "var(--rpt-text-muted)" }}>{String(r.explanation)}</span> },
            ]}
            rows={data.anomalyColumns as any}
            maxRows={8}
          />
        </ReportSection>
      ) : (
        <ReportCallout title="No Anomalies Detected" text="All numeric columns passed distribution checks within configured thresholds." severity="success" />
      )}

      {/* Statistical tests */}
      {data.statisticalTests.length > 0 && (
        <ReportSection title="Statistical Tests">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.statisticalTests.map((t, i) => (
              <div key={i} className="rpt-card-sm" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div className="rpt-h3">{t.testName}</div>
                    <ReportBadge
                      label={t.isSignificant ? "Significant" : "Not Significant"}
                      variant={t.isSignificant ? "critical" : "success"}
                      dot
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.5 }}>{t.interpretation}</div>
                  {t.businessImplication && (
                    <div style={{ marginTop: 4, fontSize: 10, color: "var(--rpt-text-faint)" }}>{t.businessImplication}</div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div className="rpt-label">p-value</div>
                  <div style={{ fontFamily: "var(--rpt-font-mono)", fontSize: 12, fontWeight: 700 }}>
                    {t.pValue.toFixed(4)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Root cause analyses */}
      {data.rootCauseAnalyses.length > 0 && (
        <ReportSection title="Root Cause Analysis">
          {data.rootCauseAnalyses.map((rca, i) => (
            <div key={i} className="rpt-card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div className="rpt-h3">{rca.targetMetric}</div>
                <ReportBadge label={`${rca.deviationPct >= 0 ? "+" : ""}${rca.deviationPct.toFixed(1)}% deviation`}
                  variant={rca.deviationPct > 0 ? "warning" : "info"} />
                <ReportBadge label={`${Math.round(rca.confidence * 100)}% confidence`} variant="brand" />
              </div>
              {/* Top root cause nodes */}
              {rca.rootCauses.slice(0, 2).map((node: RootCauseNode, ni) => (
                <div key={ni} style={{ marginBottom: 8 }}>
                  <div className="rpt-label" style={{ marginBottom: 4 }}>{node.column}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {node.segments.slice(0, 3).map((seg, si) => (
                      <div key={si} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontFamily: "var(--rpt-font-mono)", fontSize: 10, color: "var(--rpt-text-muted)", minWidth: 100 }}>{seg.value}</div>
                        <div style={{ flex: 1 }}>
                          <div className="rpt-progress-track">
                            <div className="rpt-progress-fill" style={{ width: `${Math.min(100, Math.abs(seg.contribution))}%` }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, minWidth: 40, textAlign: "right" }}>
                          {seg.contribution.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.5 }}>{rca.conclusion}</div>
            </div>
          ))}
        </ReportSection>
      )}

      {/* Investigations */}
      {data.investigations.length > 0 && (
        <ReportSection title="Autonomous Investigations">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.investigations.slice(0, 3).map((inv, i) => {
              const topHyp = inv.leadingHypotheses?.[0];
              return (
                <div key={i} className="rpt-card-sm">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div className="rpt-h3" style={{ flex: 1, marginRight: 8 }}>{inv.finding}</div>
                    {topHyp && (
                      <ReportBadge
                        label={topHyp.verdict}
                        variant={topHyp.verdict === "supported" ? "success" : topHyp.verdict === "rejected" ? "critical" : "warning"}
                        dot
                      />
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.5 }}>{inv.conclusion}</div>
                </div>
              );
            })}
          </div>
        </ReportSection>
      )}
    </ReportPage>
  );
}
