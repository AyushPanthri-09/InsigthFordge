import React from "react";
import type { P4DataQualityData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportExecutiveInsight } from "../primitives/ReportExecutiveInsight";
import { ReportHeroMetric } from "../primitives/ReportHeroMetric";
import { ReportSummaryTile } from "../primitives/ReportSummaryTile";
import { ReportSectionHeader } from "../primitives/ReportSectionHeader";
import { ReportTable } from "../primitives/ReportTable";
import { ReportInsightCard } from "../primitives/ReportInsightCard";
import { ReportChart } from "../primitives/ReportChart";

interface Props {
  data: P4DataQualityData;
  datasetName: string;
  generatedAt: string;
}

export function P5_DataQuality({ data, datasetName, generatedAt }: Props) {
  const qualityScore = Number(data.qualityScore ?? 0);
  const status: "success" | "warning" | "critical" =
    qualityScore >= 80
      ? "success"
      : qualityScore >= 60
        ? "warning"
        : "critical";

  const issues = data.issues ?? [];
  const hasIssues = issues.length > 0;

  const critical = issues.filter((i) => i.severity === "critical");
  const warning = issues.filter((i) => i.severity === "warning");
  const info = issues.filter((i) => i.severity === "info");

  const pieSpec = {
    id: "quality_pie",
    type: "pie" as const,
    title: "Issues Severity Breakdown",
    description: "Breakdown of quality issues by priority level",
    xKey: "name",
    yKeys: ["value"],
    data: [
      {
        name: "Critical",
        value: critical.length,
        color: "var(--rpt-critical)",
      },
      {
        name: "Warning",
        value: warning.length,
        color: "var(--rpt-warning)",
      },
      {
        name: "Info / Clean",
        value: Math.max(1, info.length),
        color: "var(--rpt-success)",
      },
    ],
  };

  const decisionRows = (data.daieDecisions ?? []).map((d, idx) => ({
    id: String(idx),
    column: d.column,
    decision: d.decision,
    nullPct: `${(Number(d.nullPct) * 100).toFixed(1)}%`,
    status: d.severity,
  }));

  const decisionColumns = [
    { key: "column", header: "Column Label", mono: true },
    { key: "decision", header: "Decision Applied" },
    { key: "nullPct", header: "Nulls Rate", align: "right" },
    {
      key: "status",
      header: "Status Guard",
      render: (row: (typeof decisionRows)[number]) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: "var(--rpt-font-caption)",
            color:
              row.status === "critical"
                ? "var(--rpt-critical)"
                : row.status === "warning"
                  ? "var(--rpt-warning)"
                  : "var(--rpt-success)",
            fontWeight: 800,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background:
                row.status === "critical"
                  ? "var(--rpt-critical)"
                  : row.status === "warning"
                    ? "var(--rpt-warning)"
                    : "var(--rpt-success)",
              display: "inline-block",
            }}
          />
          {row.status}
        </span>
      ),
    },
  ];

  const issuesForCards = issues.slice(0, 3);

  return (
    <ReportPage
      pageNumber={4}
      totalPages={13}
      title="Data Quality Posture"
      subtitle="Comprehensive data cleaning metrics, missing values, duplicates, and column decisions"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--rpt-space-xl, 32px)",
        }}
      >
        {/* Row 1 */}
        <ReportExecutiveInsight
          insight={`Dataset meets governance standards with ${qualityScore}% completeness.`}
          impact="High reliability for executive decision-making."
          confidence={qualityScore / 100}
          status={status}
        />

        {/* Row 2 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: "var(--rpt-space-xl)",
          }}
        >
          <div>
            <ReportHeroMetric
              label="Data Quality Index"
              value={`${qualityScore}%`}
              variant={status === "success" ? "success" : "warning"}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--rpt-space-md)",
                marginTop: "var(--rpt-space-md)",
              }}
            >
              <ReportSummaryTile
                label="Rows Removed"
                value={data.rowsRemoved}
              />
              <ReportSummaryTile
                label="Columns Inspected"
                value={data.daieDecisions?.length || 0}
              />
            </div>
          </div>

          <div>
            <ReportChart spec={pieSpec} height={180} />
            <div
              style={{
                fontSize: "var(--rpt-font-caption)",
                color: "var(--rpt-text-muted)",
                marginTop: "var(--rpt-space-sm)",
              }}
            >
              {critical.length > 0
                ? `${critical.length} critical issue${critical.length > 1 ? "s" : ""} require attention.`
                : "No critical issues detected."}
            </div>
          </div>
        </div>

        {/* Row 3 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--rpt-space-lg, 24px)",
            marginTop: "var(--rpt-space-lg, 24px)",
          }}
        >
          <div>
            <ReportSectionHeader title="Column Decisions" />
            {decisionRows.length > 0 ? (
              <ReportTable
                columns={decisionColumns as any}
                rows={decisionRows}
                maxRows={6}
                striped
                rowTone={(row) =>
                  row.status === "critical"
                    ? "critical"
                    : row.status === "warning"
                      ? "warning"
                      : undefined
                }
              />
            ) : (
              <div
                style={{
                  marginTop: "var(--rpt-space-md)",
                  background: "var(--rpt-surface2)",
                  border: "1px solid var(--rpt-border-light)",
                  borderRadius: 6,
                  padding: 12,
                  color: "var(--rpt-text-muted)",
                  fontSize: "var(--rpt-font-body)",
                }}
              >
                No column decisions available.
              </div>
            )}
          </div>

          <div>
            <ReportSectionHeader title="Quality Alerts" />
            {hasIssues ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--rpt-space-sm)",
                }}
              >
                {issuesForCards.map((issue) => (
                  <ReportInsightCard
                    key={issue.id}
                    title={issue.description}
                    badge={issue.severity}
                  >
                    {issue.action}
                  </ReportInsightCard>
                ))}
              </div>
            ) : (
              <ReportExecutiveInsight
                insight="No data quality issues were detected in this dataset."
                impact="Dataset readiness is high with no critical remediation required."
                confidence={1}
                status="success"
              />
            )}
          </div>
        </div>
      </div>
    </ReportPage>
  );
}
