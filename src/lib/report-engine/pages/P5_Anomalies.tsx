import React from "react";
import type { P5AnomaliesData, ReportSeverity } from "../types";
import type { RootCauseNode } from "@/services/analytics/types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportTable } from "../primitives/ReportTable";
import { ReportCallout } from "../primitives/ReportCallout";

const TOTAL_PAGES = 9;

interface Props {
  data: P5AnomaliesData;
  datasetName: string;
  generatedAt: string;
}

export function P5_Anomalies({ data, datasetName, generatedAt }: Props) {
  const totalAnomalies = data.anomalyColumns.reduce(
    (sum, c) => sum + c.anomalyCount,
    0,
  );
  const significantTests = data.statisticalTests.filter(
    (t) => t.isSignificant,
  ).length;

  return (
    <ReportPage
      pageNumber={6}
      totalPages={TOTAL_PAGES}
      title="Risk, Anomalies & Root Cause"
      subtitle="Outlier exposure, statistical evidence, root-cause segments, and autonomous investigations"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <ReportSection title="Exception Overview">
        <div className="rpt-grid rpt-grid-4" style={{ gap: 10 }}>
          {[
            {
              label: "Anomaly Columns",
              value: String(data.anomalyColumns.length),
              variant: data.anomalyColumns.length ? "warning" : "success",
            },
            {
              label: "Total Anomalies",
              value: totalAnomalies.toLocaleString(),
              variant: totalAnomalies ? "warning" : "success",
            },
            {
              label: "Significant Tests",
              value: String(significantTests),
              variant: significantTests ? "critical" : "success",
            },
            {
              label: "Investigations",
              value: String(data.investigations.length),
              variant: "brand",
            },
          ].map(
            (item: {
              label: string;
              value: string | number;
              variant: ReportSeverity | "brand";
            }) => (
              <div key={item.label} className="rpt-kpi">
                <div className="rpt-kpi-label">{item.label}</div>
                <div className="rpt-kpi-value">{item.value}</div>
                <div style={{ marginTop: 8 }}>
                  <ReportBadge
                    label={
                      item.variant === "brand"
                        ? "AI reviewed"
                        : item.variant === "success"
                          ? "Clean"
                          : "Review"
                    }
                    variant={item.variant}
                    dot
                  />
                </div>
              </div>
            ),
          )}
        </div>
      </ReportSection>

      {data.anomalyColumns.length > 0 ? (
        <ReportSection title="Anomaly Detection Matrix">
          <ReportTable
            columns={[
              { key: "column", header: "Column", mono: true },
              { key: "anomalyCount", header: "Anomalies", align: "right" },
              { key: "distributionShape", header: "Distribution" },
              {
                key: "zScoreThreshold",
                header: "Z-Threshold",
                align: "right",
                render: (r) => String(Number(r.zScoreThreshold).toFixed(1)),
              },
              {
                key: "explanation",
                header: "Executive Interpretation",
                render: (r) => (
                  <span
                    style={{ fontSize: 10, color: "var(--rpt-text-muted)" }}
                  >
                    {String(r.explanation)}
                  </span>
                ),
              },
            ]}
            rows={data.anomalyColumns}
            maxRows={8}
          />
        </ReportSection>
      ) : (
        <ReportCallout
          title="Anomaly Readiness Confirmed"
          text="Numeric columns passed the configured distribution and outlier checks. Continue monitoring as new records arrive or business thresholds change."
          severity="success"
        />
      )}

      {data.rootCauseAnalyses.length > 0 && (
        <ReportSection title="Root Cause Panels">
          {data.rootCauseAnalyses.slice(0, 2).map((rca, i) => (
            <div key={i} className="rpt-card" style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div className="rpt-h3">{rca.targetMetric}</div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 10.5,
                      color: "var(--rpt-text-muted)",
                    }}
                  >
                    {rca.conclusion}
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
                    label={`${rca.deviationPct >= 0 ? "+" : ""}${rca.deviationPct.toFixed(1)}% deviation`}
                    variant={
                      Math.abs(rca.deviationPct) > 10 ? "warning" : "info"
                    }
                  />
                  <ReportBadge
                    label={`${Math.round(rca.confidence * 100)}% confidence`}
                    variant="brand"
                  />
                </div>
              </div>
              <div className="rpt-grid rpt-grid-2" style={{ gap: 12 }}>
                {rca.rootCauses.slice(0, 2).map((node: RootCauseNode, ni) => (
                  <div key={ni} className="rpt-stat-tile">
                    <div className="rpt-label" style={{ marginBottom: 8 }}>
                      {node.column}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 7,
                      }}
                    >
                      {node.segments.slice(0, 3).map((seg, si) => (
                        <div key={si}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                              fontSize: 9.5,
                              marginBottom: 3,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--rpt-font-mono)",
                                color: "var(--rpt-text-muted)",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {seg.value}
                            </span>
                            <strong>{seg.contribution.toFixed(1)}%</strong>
                          </div>
                          <div className="rpt-progress-track">
                            <div
                              className="rpt-progress-fill"
                              style={{
                                width: `${Math.min(100, Math.abs(seg.contribution))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </ReportSection>
      )}

      {data.statisticalTests.length > 0 && (
        <ReportSection title="Statistical Evidence">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.statisticalTests.slice(0, 4).map((t, i) => (
              <div
                key={i}
                className={t.isSignificant ? "rpt-risk-block" : "rpt-card-sm"}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <div className="rpt-h3">{t.testName}</div>
                    <ReportBadge
                      label={
                        t.isSignificant ? "Significant" : "Not significant"
                      }
                      variant={t.isSignificant ? "critical" : "success"}
                      dot
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "var(--rpt-text-muted)",
                      lineHeight: 1.45,
                    }}
                  >
                    {t.interpretation}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 72 }}>
                  <div className="rpt-label">p-value</div>
                  <div
                    style={{
                      fontFamily: "var(--rpt-font-mono)",
                      fontSize: 13,
                      fontWeight: 850,
                    }}
                  >
                    {t.pValue.toFixed(4)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {data.investigations.length > 0 && (
        <ReportSection title="Autonomous Investigation Notes">
          <div className="rpt-grid rpt-grid-3" style={{ gap: 10 }}>
            {data.investigations.slice(0, 3).map((inv, i) => {
              const topHyp = inv.leadingHypotheses?.[0];
              return (
                <div key={i} className="rpt-ai-block">
                  {topHyp && (
                    <ReportBadge
                      label={topHyp.verdict}
                      variant={
                        topHyp.verdict === "supported"
                          ? "success"
                          : topHyp.verdict === "rejected"
                            ? "critical"
                            : "warning"
                      }
                      dot
                    />
                  )}
                  <div
                    className="rpt-h3"
                    style={{ marginTop: 9, marginBottom: 5 }}
                  >
                    {inv.finding}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--rpt-text-muted)",
                      lineHeight: 1.45,
                    }}
                  >
                    {inv.conclusion}
                  </div>
                </div>
              );
            })}
          </div>
        </ReportSection>
      )}
    </ReportPage>
  );
}
