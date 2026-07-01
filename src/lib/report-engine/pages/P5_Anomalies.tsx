import React from "react";
import type { P5AnomaliesData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportTable } from "../primitives/ReportTable";
import { ReportCallout } from "../primitives/ReportCallout";
import { ReportChart } from "../primitives/ReportChart";

interface Props {
  data: P5AnomaliesData;
  datasetName: string;
  generatedAt: string;
}

export function P5_Anomalies({ data, datasetName, generatedAt }: Props) {
  const totalAnomalies = data.anomalyColumns.reduce(
    (sum, c) => sum + c.anomalyCount,
    0
  );
  const significantTests = data.statisticalTests.filter(
    (t) => t.isSignificant
  ).length;

  const barSpec = {
    id: "anomaly_bar",
    type: "bar" as const,
    title: "Outlier Counts by Column",
    description: "Frequency of flagged anomalous records",
    xKey: "column",
    yKeys: ["anomalyCount"],
    data: data.anomalyColumns.map((col) => ({
      column: col.column,
      anomalyCount: col.anomalyCount,
    })),
  };

  return (
    <ReportPage
      pageNumber={8}
      totalPages={11}
      title="Anomaly & Outlier Detection"
      subtitle="Z-score outlier exposure, anomalous values, and automated risk reviews"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        
        {/* Exception Overview */}
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 14 }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Anomalous Attributes", value: String(data.anomalyColumns.length), variant: "warning" },
                { label: "Total Exception Rows", value: totalAnomalies.toLocaleString(), variant: "critical" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--rpt-surface2)",
                    border: "1px solid var(--rpt-border)",
                    borderRadius: 6,
                    padding: "12px 10px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 64,
                  }}
                >
                  <span style={{ fontSize: 8.5, fontWeight: 800, textTransform: "uppercase", color: "var(--rpt-text-muted)", letterSpacing: "0.08em" }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 850, color: item.variant === "critical" ? "var(--rpt-critical)" : "var(--rpt-warning)", marginTop: 4 }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "var(--rpt-surface2)",
                border: "1px solid var(--rpt-border)",
                borderRadius: 6,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--rpt-brand-dark)", marginBottom: 4 }}>
                Anomaly Risk Assessment
              </div>
              <p style={{ fontSize: 9.8, color: "var(--rpt-text-muted)", lineHeight: 1.45, margin: 0 }}>
                Autonomous audits run multi-variant distribution profiles to verify record consistency. Outliers are filtered using a z-score cutoff threshold of 3.0.
              </p>
            </div>
          </div>

          {/* Anomaly Bar Chart */}
          {data.anomalyColumns.length > 0 ? (
            <div className="rpt-card" style={{ padding: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--rpt-brand-dark)", marginBottom: 6 }}>
                Outliers Count by Column
              </div>
              <div className="rpt-chart-panel" style={{ height: 110 }}>
                <ReportChart spec={barSpec} height={110} />
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "var(--rpt-success-soft)",
                border: "1px solid rgba(4, 120, 87, 0.15)",
                borderRadius: 6,
                padding: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 10, color: "var(--rpt-success)", fontWeight: 700 }}>
                No outlier records flagged in this verification run.
              </span>
            </div>
          )}

        </div>

        {/* Anomaly Detection Matrix */}
        {data.anomalyColumns.length > 0 ? (
          <ReportSection title="Anomalous Fields Register">
            <ReportTable
              columns={[
                { key: "column", header: "Column Label", mono: true },
                { key: "anomalyCount", header: "Outliers Count", align: "right" },
                { key: "distributionShape", header: "Distribution" },
                {
                  key: "zScoreThreshold",
                  header: "Z-Cutoff",
                  align: "right",
                  render: (r) => String(Number(r.zScoreThreshold).toFixed(1)),
                },
                {
                  key: "explanation",
                  header: "Executive Impact Interpretation",
                  render: (r) => (
                    <span style={{ fontSize: 9.5, color: "var(--rpt-text-muted)" }}>
                      {String(r.explanation)}
                    </span>
                  ),
                },
              ]}
              rows={data.anomalyColumns}
              maxRows={5}
            />
          </ReportSection>
        ) : (
          <ReportCallout
            title="Clean Distribution Verified"
            text="All numeric fields comply with governed normal distribution constraints. No extreme outlier values require staging or exclusion."
            severity="success"
          />
        )}

        {/* Statistical Evidence (Significant Hypothesis Tests) */}
        {data.statisticalTests.length > 0 && (
          <ReportSection title="Statistical Hypothesis Testing Results">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {data.statisticalTests.slice(0, 2).map((t, idx) => (
                <div
                  key={idx}
                  className={t.isSignificant ? "rpt-risk-block" : "rpt-card-sm"}
                  style={{
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 86,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--rpt-brand-dark)" }}>
                        {t.testName}
                      </span>
                      <ReportBadge
                        label={t.isSignificant ? "Significant" : "Not Sig"}
                        variant={t.isSignificant ? "critical" : "success"}
                        dot
                      />
                    </div>
                    <p style={{ fontSize: 9.2, color: "var(--rpt-text-muted)", lineHeight: 1.4, margin: 0 }}>
                      {t.interpretation}
                    </p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--rpt-border-light)", paddingTop: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 8.5, color: "var(--rpt-text-muted)" }}>Test Statistic: <code style={{ fontFamily: "var(--rpt-font-mono)" }}>{t.statistic.toFixed(2)}</code></span>
                    <span style={{ fontSize: 10, fontWeight: 800 }}>p: {t.pValue.toFixed(4)}</span>
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
