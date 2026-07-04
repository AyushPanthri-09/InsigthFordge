import React from "react";
import type { AppendixData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportTable } from "../primitives/ReportTable";
import { ReportBadge } from "../primitives/ReportBadge";

function fmt(v: number): string {
  if (!isFinite(v)) return "-";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  return Number.isInteger(v) ? String(v) : v.toFixed(3);
}

interface Props {
  data: AppendixData;
  datasetName: string;
  generatedAt: string;
}

export function Appendix({ data, datasetName, generatedAt }: Props) {
  const statsRows = Object.entries(data.extendedStats).map(([col, s]) => ({
    column: col,
    mean: fmt(s.mean),
    median: fmt(s.median),
    stdDev: fmt(s.stdev),
    min: fmt(s.min),
    max: fmt(s.max),
    skewness: s.skewness.toFixed(3),
    shape: s.distributionShape,
  }));

  return (
    <ReportPage
      pageNumber={13}
      totalPages={13}
      title="Technical Appendix"
      subtitle="Staged dataset profiles, p-value verification metrics, and assumptions"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Dataset Metadata */}
        <ReportSection title="Analytical Metadata Register">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            {[
              { label: "Dataset Filename", value: data.datasetName },
              { label: "Detected Domain", value: data.domain },
              {
                label: "Total Record Count",
                value: data.rowCount.toLocaleString(),
              },
              { label: "Feature Columns", value: String(data.columnCount) },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: "var(--rpt-surface2)",
                  border: "1px solid var(--rpt-border)",
                  borderRadius: 6,
                  padding: "12px 10px",
                }}
              >
                <div
                  style={{
                    fontSize: 8.5,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "var(--rpt-text-muted)",
                    letterSpacing: "0.05em",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 750,
                    color: "var(--rpt-ink)",
                    wordBreak: "break-all",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Extended Stats */}
        {statsRows.length > 0 && (
          <ReportSection title="Extended Feature Metrics Summary">
            <ReportTable
              columns={[
                { key: "column", header: "Column Label", mono: true },
                { key: "mean", header: "Mean", align: "right" },
                { key: "median", header: "Median", align: "right" },
                { key: "stdDev", header: "Std Dev", align: "right" },
                { key: "min", header: "Min", align: "right" },
                { key: "max", header: "Max", align: "right" },
                { key: "skewness", header: "Skewness", align: "right" },
                { key: "shape", header: "Distribution" },
              ]}
              rows={statsRows}
              maxRows={6}
            />
          </ReportSection>
        )}

        {/* Statistical Test Details & Assumptions */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 14,
          }}
        >
          <ReportSection title="Statistical Verification Register">
            {data.statisticalTests.length > 0 ? (
              <ReportTable
                columns={[
                  { key: "testName", header: "Method" },
                  {
                    key: "statistic",
                    header: "Statistic",
                    align: "right",
                    render: (r) => Number(r.statistic).toFixed(2),
                  },
                  {
                    key: "pValue",
                    header: "p-value",
                    align: "right",
                    render: (r) => Number(r.pValue).toFixed(4),
                  },
                  {
                    key: "passed",
                    header: "Verdict",
                    render: (r) => (
                      <ReportBadge
                        label={r.passed ? "Pass" : "Fail"}
                        variant={r.passed ? "success" : "critical"}
                        dot
                      />
                    ),
                  },
                ]}
                rows={data.statisticalTests}
                maxRows={4}
              />
            ) : (
              <div
                style={{
                  fontSize: 9.5,
                  color: "var(--rpt-text-muted)",
                  padding: 10,
                  background: "var(--rpt-surface2)",
                  borderRadius: 6,
                }}
              >
                No explicit multi-variant test records registered.
              </div>
            )}
          </ReportSection>

          <ReportSection title="Assumptions & Methodology">
            <div
              style={{
                background: "var(--rpt-surface2)",
                border: "1px solid var(--rpt-border)",
                borderRadius: 6,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 750,
                  color: "var(--rpt-brand-dark)",
                  marginBottom: 4,
                }}
              >
                Governed Framework Notes
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 12,
                  fontSize: 8.8,
                  color: "var(--rpt-text-muted)",
                  lineHeight: 1.45,
                }}
              >
                <li style={{ marginBottom: 4 }}>
                  Confidence intervals are set at a baseline of 95% threshold across numeric
                  variables.
                </li>
                <li style={{ marginBottom: 4 }}>
                  Pearson coefficients compute linear relationships ($r$). Multilinear relations
                  require additional model regressors.
                </li>
                <li>Anomaly thresholds flag records with absolute z-scores greater than 3.0.</li>
              </ul>
            </div>
          </ReportSection>
        </div>
      </div>
    </ReportPage>
  );
}
