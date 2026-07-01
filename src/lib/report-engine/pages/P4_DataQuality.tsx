import React from "react";
import type { P4DataQualityData, ReportSeverity } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportGrid } from "../primitives/ReportGrid";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportTable } from "../primitives/ReportTable";
import { ReportCallout } from "../primitives/ReportCallout";

const TOTAL_PAGES = 9;

interface Props {
  data: P4DataQualityData;
  datasetName: string;
  generatedAt: string;
}

export function P4_DataQuality({ data, datasetName, generatedAt }: Props) {
  const removedPct =
    data.rowsBefore > 0
      ? ((data.rowsRemoved / data.rowsBefore) * 100).toFixed(1)
      : "0";
  const qualityVariant =
    data.qualityScore >= 80
      ? "success"
      : data.qualityScore >= 60
        ? "warning"
        : "critical";
  const totalIssues = data.issues.length;

  return (
    <ReportPage
      pageNumber={5}
      totalPages={TOTAL_PAGES}
      title="Data Trust & Quality"
      subtitle="Readiness score, cleaning decisions, issue severity, and column-level reliability"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <ReportSection title="Quality Control Center">
        <div
          className="rpt-card"
          style={{
            display: "grid",
            gridTemplateColumns: "170px 1fr",
            gap: 22,
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 42,
                fontWeight: 850,
                color: "var(--rpt-ink)",
                lineHeight: 1,
              }}
            >
              {data.qualityScore}
            </div>
            <div className="rpt-label" style={{ marginTop: 4 }}>
              Quality score / 100
            </div>
            <div style={{ marginTop: 10 }}>
              <ReportBadge
                label={
                  data.qualityScore >= 80
                    ? "Board ready"
                    : data.qualityScore >= 60
                      ? "Analyst review"
                      : "High caution"
                }
                variant={qualityVariant}
                dot
              />
            </div>
          </div>
          <div>
            <div className="rpt-progress-track">
              <div
                className="rpt-progress-fill"
                style={{ width: `${data.qualityScore}%` }}
              />
            </div>
            <div
              className="rpt-grid rpt-grid-4"
              style={{ gap: 8, marginTop: 14 }}
            >
              {[
                {
                  label: "Rows Before",
                  value: data.rowsBefore.toLocaleString(),
                },
                { label: "Rows After", value: data.rowsAfter.toLocaleString() },
                {
                  label: "Rows Removed",
                  value: `${data.rowsRemoved.toLocaleString()} (${removedPct}%)`,
                },
                { label: "Open Issues", value: String(totalIssues) },
              ].map(({ label, value }) => (
                <div key={label} className="rpt-stat-tile">
                  <div className="rpt-label">{label}</div>
                  <div className="rpt-stat-tile-value">{value}</div>
                </div>
              ))}
            </div>
            {data.notes && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 10.8,
                  color: "var(--rpt-text-muted)",
                  lineHeight: 1.5,
                }}
              >
                {data.notes}
              </div>
            )}
          </div>
        </div>
      </ReportSection>

      <ReportSection title="Issue Severity">
        <ReportGrid cols={3} gap={10}>
          {[
            {
              label: "Critical",
              count: data.issuesByCategory.critical.length,
              variant: "critical" as const,
            },
            {
              label: "Warnings",
              count: data.issuesByCategory.warning.length,
              variant: "warning" as const,
            },
            {
              label: "Informational",
              count: data.issuesByCategory.info.length,
              variant: "info" as const,
            },
          ].map((item) => (
            <div key={item.label} className="rpt-card-sm">
              <ReportBadge label={item.label} variant={item.variant} dot />
              <div
                style={{
                  marginTop: 9,
                  fontSize: 26,
                  fontWeight: 850,
                  color: "var(--rpt-ink)",
                  lineHeight: 1,
                }}
              >
                {item.count}
              </div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 10,
                  color: "var(--rpt-text-muted)",
                }}
              >
                Detected during cleaning and profiling
              </div>
            </div>
          ))}
        </ReportGrid>
      </ReportSection>

      {data.issuesByCategory.critical.length > 0 && (
        <ReportSection title="Critical Risk Blocks">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.issuesByCategory.critical.slice(0, 3).map((issue) => (
              <ReportCallout
                key={issue.id}
                title={issue.title}
                text={issue.reasoning}
                severity="critical"
              />
            ))}
          </div>
        </ReportSection>
      )}

      {data.issuesByCategory.warning.length > 0 && (
        <ReportSection title="Quality Warnings">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.issuesByCategory.warning.slice(0, 3).map((issue) => (
              <ReportCallout
                key={issue.id}
                title={issue.title}
                text={issue.reasoning}
                severity="warning"
              />
            ))}
          </div>
        </ReportSection>
      )}

      {data.daieDecisions.length > 0 && (
        <ReportSection title="AI Column Decisions">
          <ReportTable
            columns={[
              { key: "column", header: "Column", mono: true },
              {
                key: "nullPct",
                header: "Null %",
                align: "right",
                render: (r) => `${(Number(r.nullPct) * 100).toFixed(1)}%`,
              },
              {
                key: "decision",
                header: "Decision",
                render: (r) => (
                  <ReportBadge label={String(r.decision)} variant="brand" />
                ),
              },
              {
                key: "severity",
                header: "Severity",
                render: (r) => (
                  <ReportBadge
                    label={String(r.severity)}
                    variant={r.severity as ReportSeverity}
                    dot
                  />
                ),
              },
            ]}
            rows={data.daieDecisions}
            maxRows={8}
          />
        </ReportSection>
      )}

      {data.columnProfiles.length > 0 && (
        <ReportSection title="Column Reliability Snapshot">
          <ReportTable
            columns={[
              { key: "name", header: "Column", mono: true },
              { key: "dataType", header: "Type" },
              { key: "nullCount", header: "Nulls", align: "right" },
              { key: "uniqueCount", header: "Unique", align: "right" },
            ]}
            rows={data.columnProfiles}
            maxRows={10}
          />
        </ReportSection>
      )}
    </ReportPage>
  );
}
