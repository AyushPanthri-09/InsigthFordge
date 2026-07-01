import React from "react";
import type { AppendixData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportTable } from "../primitives/ReportTable";
import { ReportBadge } from "../primitives/ReportBadge";

const TOTAL_PAGES = 9;

function fmt(v: number): string {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  return v % 1 === 0 ? String(v) : v.toFixed(3);
}

interface Props { data: AppendixData; datasetName: string; generatedAt: string; }

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
    <ReportPage pageNumber={9} totalPages={TOTAL_PAGES} title="Appendix" subtitle="Technical Reference" datasetName={datasetName} generatedAt={generatedAt}>
      {/* Dataset metadata */}
      <ReportSection title="Dataset Metadata">
        <div className="rpt-grid rpt-grid-4" style={{ gap: 8 }}>
          {[
            { label: "Dataset",  value: data.datasetName },
            { label: "Domain",   value: data.domain },
            { label: "Rows",     value: data.rowCount.toLocaleString() },
            { label: "Columns",  value: String(data.columnCount) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "var(--rpt-surface2)", borderRadius: 8, padding: "10px 12px" }}>
              <div className="rpt-label" style={{ marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Extended statistics */}
      {statsRows.length > 0 && (
        <ReportSection title="Extended Statistics">
          <ReportTable
            columns={[
              { key: "column",   header: "Column",   mono: true },
              { key: "mean",     header: "Mean",     align: "right" },
              { key: "median",   header: "Median",   align: "right" },
              { key: "stdDev",   header: "Std Dev",  align: "right" },
              { key: "min",      header: "Min",      align: "right" },
              { key: "max",      header: "Max",      align: "right" },
              { key: "skewness", header: "Skewness", align: "right" },
              { key: "shape",    header: "Shape" },
            ]}
            rows={statsRows as any}
            maxRows={12}
          />
        </ReportSection>
      )}

      {/* Statistical tests */}
      {data.statisticalTests.length > 0 && (
        <ReportSection title="Statistical Tests">
          <ReportTable
            columns={[
              { key: "testName",       header: "Test" },
              { key: "column",         header: "Column",  mono: true },
              { key: "statistic",      header: "Statistic", align: "right",
                render: (r) => Number(r.statistic).toFixed(4) },
              { key: "pValue",         header: "p-value",   align: "right",
                render: (r) => Number(r.pValue).toFixed(4) },
              { key: "passed",         header: "Result",
                render: (r) => <ReportBadge label={r.passed ? "Pass" : "Fail"} variant={r.passed ? "success" : "critical"} dot /> },
            ]}
            rows={data.statisticalTests as any}
          />
        </ReportSection>
      )}

      {/* Relationships */}
      {data.relationships.length > 0 && (
        <ReportSection title="Discovered Relationships">
          <ReportTable
            columns={[
              { key: "from",       header: "From",       mono: true },
              { key: "to",         header: "To",         mono: true },
              { key: "type",       header: "Type" },
              { key: "confidence", header: "Confidence", align: "right",
                render: (r) => `${Math.round(Number(r.confidence) * 100)}%` },
            ]}
            rows={data.relationships as any}
            maxRows={10}
          />
        </ReportSection>
      )}

      {/* Column profiles */}
      {data.columnProfiles.length > 0 && (
        <ReportSection title="Full Column Profiles">
          <ReportTable
            columns={[
              { key: "name",        header: "Column",    mono: true },
              { key: "dataType",    header: "Type" },
              { key: "nullCount",   header: "Nulls",     align: "right" },
              { key: "uniqueCount", header: "Unique",    align: "right" },
              { key: "sampleValues", header: "Samples",
                render: (r) => {
                  const vals = (r.sampleValues as string[] | undefined) ?? [];
                  return <span style={{ fontSize: 9, color: "var(--rpt-text-faint)" }}>{vals.slice(0, 3).join(", ")}</span>;
                }},
            ]}
            rows={data.columnProfiles as any}
          />
        </ReportSection>
      )}
    </ReportPage>
  );
}
