import React from "react";
import type { P5AnomaliesData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBadge } from "../primitives/ReportBadge";

interface Props {
  data: P5AnomaliesData;
  datasetName: string;
  generatedAt: string;
}

export function P10_RootCause({ data, datasetName, generatedAt }: Props) {
  const rca = data.rootCauseAnalyses ?? [];
  const investigations = data.investigations ?? [];

  const mainInv = investigations[0];
  const drivers = mainInv?.driverImportance ?? [];
  const leading = mainInv?.leadingHypotheses ?? [];
  const rejected = mainInv?.rejectedHypotheses ?? [];

  return (
    <ReportPage
      pageNumber={10}
      totalPages={13}
      title="Root Cause Analysis (RCA)"
      subtitle="Driver decomposition, feature importance scans, and verified cause-effect linkages"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* RCA Summary Callout */}
        <div
          style={{
            background: "var(--rpt-surface2)",
            border: "1px solid var(--rpt-border)",
            borderRadius: 6,
            padding: 12,
            borderLeft: "3px solid var(--rpt-critical)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: "var(--rpt-critical)",
              textTransform: "uppercase",
              marginBottom: 3,
            }}
          >
            Root Cause Investigation Summary
          </div>
          <p
            style={{
              fontSize: 10.5,
              color: "var(--rpt-ink)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {mainInv?.conclusion ||
              "Root cause scans ran across all categorical dimensions. Driver importance calculations identify which columns explain the variance and anomalous deviations in the target measures."}
          </p>
        </div>

        {/* RCA Driver Mappings */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 14,
          }}
        >
          <ReportSection title="Top Metric Drivers (Importance Index)">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {drivers.length > 0 ? (
                drivers.map((drv, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--rpt-surface2)",
                      border: "1px solid var(--rpt-border-light)",
                      borderRadius: 6,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: "var(--rpt-brand-dark)",
                          fontFamily: "var(--rpt-font-mono)",
                        }}
                      >
                        {drv.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          color: "var(--rpt-brand)",
                        }}
                      >
                        {drv.contributionPct.toFixed(0)}%
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div
                      style={{
                        width: "100%",
                        height: 6,
                        borderRadius: 3,
                        background: "var(--rpt-border-light)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${drv.contributionPct}%`,
                          height: "100%",
                          background: "var(--rpt-brand)",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    color: "var(--rpt-text-muted)",
                    fontSize: 11,
                    padding: "20px 0",
                  }}
                >
                  No categorical drivers with significant contribution
                  coefficients were detected.
                </div>
              )}
            </div>
          </ReportSection>

          <ReportSection title="Verified vs Rejected Explanations">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Leading Hypothesis */}
              {leading.length > 0 && (
                <div
                  style={{
                    background: "var(--rpt-success-soft)",
                    border: "1px solid rgba(4, 120, 87, 0.15)",
                    borderRadius: 6,
                    padding: 10,
                  }}
                >
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
                        fontWeight: 800,
                        color: "var(--rpt-success)",
                      }}
                    >
                      CONFIRMED LEADING CAUSE
                    </span>
                    <ReportBadge
                      label={`${(leading[0].confidence * 100).toFixed(0)}% confidence`}
                      variant="success"
                    />
                  </div>
                  <p
                    style={{
                      fontSize: 9.2,
                      color: "var(--rpt-text)",
                      lineHeight: 1.4,
                      margin: 0,
                    }}
                  >
                    {leading[0].statement}
                  </p>
                </div>
              )}

              {/* Rejected Hypothesis */}
              {rejected.length > 0 && (
                <div
                  style={{
                    background: "var(--rpt-critical-soft)",
                    border: "1px solid rgba(220, 38, 38, 0.15)",
                    borderRadius: 6,
                    padding: 10,
                  }}
                >
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
                        fontWeight: 800,
                        color: "var(--rpt-critical)",
                      }}
                    >
                      REJECTED ALTERNATIVE
                    </span>
                    <ReportBadge label="Rejected" variant="critical" />
                  </div>
                  <p
                    style={{
                      fontSize: 9.2,
                      color: "var(--rpt-text)",
                      lineHeight: 1.4,
                      margin: 0,
                    }}
                  >
                    {rejected[0].statement} (
                    <em>Rationale: {rejected[0].rationale}</em>)
                  </p>
                </div>
              )}
            </div>
          </ReportSection>
        </div>

        {/* RCA Diagnostics Table / Bullet Actions */}
        {rca.length > 0 && (
          <ReportSection title="Root Cause Observations">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              {rca.slice(0, 2).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--rpt-surface2)",
                    border: "1px solid var(--rpt-border)",
                    borderRadius: 6,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--rpt-brand-dark)",
                      marginBottom: 4,
                    }}
                  >
                    Anomaly Case Study: {item.targetMetric || "Total Count"}
                  </div>
                  <p
                    style={{
                      fontSize: 9.5,
                      color: "var(--rpt-text)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    <strong>Observation:</strong> {item.conclusion}
                    <br />
                    <strong>Evidence:</strong> {item.rootCauses?.[0]?.observation || `Deviation: ${(item.deviationPct * 100).toFixed(1)}% (Baseline: ${item.baselineValue.toLocaleString()}, Target: ${item.targetValue.toLocaleString()})`}
                    <br />
                    <strong>Recommended Action:</strong> {item.rootCauses?.[0]?.hypotheses?.[0]?.statement || "Establish baseline thresholds and alerts for this metric."}
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
