import React from "react";
import type { P4DataQualityData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportTable } from "../primitives/ReportTable";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportChart } from "../primitives/ReportChart";

interface Props {
  data: P4DataQualityData;
  datasetName: string;
  generatedAt: string;
}

export function P5_DataQuality({ data, datasetName, generatedAt }: Props) {
  const { issues = [], daieDecisions = [] } = data;

  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const warningIssues = issues.filter((i) => i.severity === "warning");
  const infoIssues = issues.filter((i) => i.severity === "info");

  // Donut chart representation data
  const pieSpec = {
    id: "quality_pie",
    type: "pie" as const,
    title: "Issues Severity Breakdown",
    description: "Breakdown of quality issues by priority level",
    xKey: "name",
    yKeys: ["value"],
    data: [
      { name: "Critical", value: criticalIssues.length || 0, color: "var(--rpt-critical)" },
      { name: "Warning", value: warningIssues.length || 0, color: "var(--rpt-warning)" },
      { name: "Info / Clean", value: Math.max(1, infoIssues.length) || 1, color: "var(--rpt-success)" },
    ],
  };

  const decisionRows = daieDecisions.map((d, i) => ({
    id: i,
    column: d.column,
    decision: d.decision,
    nullPct: `${(d.nullPct * 100).toFixed(1)}%`,
    status: d.severity,
  }));

  return (
    <ReportPage
      pageNumber={5}
      totalPages={11}
      title="Data Quality Posture"
      subtitle="Comprehensive data cleaning metrics, missing values, duplicates, and column decisions"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        
        {/* Metric tiles and chart layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 14 }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Top row mini stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Data Quality Index", value: `${data.qualityScore}%`, color: "var(--rpt-brand)" },
                { label: "Duplicate Rows Removed", value: String(data.rowsRemoved), color: "var(--rpt-accent)" },
                { label: "Inspected Columns", value: String(daieDecisions.length), color: "#7c3aed" },
              ].map((stat, i) => (
                <div
                  key={i}
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
                    {stat.label}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 850, color: stat.color, marginTop: 4 }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Structured callout block */}
            <div
              style={{
                background: "var(--rpt-surface2)",
                border: "1px solid var(--rpt-border)",
                borderRadius: 6,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--rpt-brand-dark)", marginBottom: 4 }}>
                Cleaning Posture Summary
              </div>
              <p style={{ fontSize: 9.8, color: "var(--rpt-text-muted)", lineHeight: 1.45, margin: 0 }}>
                {data.notes || "The dataset was audited for null thresholds and structural constraints. Outlier values were checked and duplicates were resolved."}
              </p>
            </div>
          </div>

          {/* Donut chart for severities */}
          <div className="rpt-card" style={{ padding: 12, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--rpt-brand-dark)", marginBottom: 6 }}>
              {pieSpec.title}
            </div>
            <div className="rpt-chart-panel" style={{ height: 110 }}>
              <ReportChart spec={pieSpec} height={110} />
            </div>
          </div>

        </div>

        {/* Column Decisions Table */}
        {decisionRows.length > 0 && (
          <ReportSection title="Metadata Column Decisions">
            <ReportTable
              columns={[
                { key: "column", header: "Column Label", mono: true },
                { key: "decision", header: "Decision Applied" },
                { key: "nullPct", header: "Nulls Rate", align: "right" },
                {
                  key: "status",
                  header: "Status Guard",
                  render: (row) => (
                    <ReportBadge
                      label={row.status}
                      variant={
                        row.status === "critical"
                          ? "critical"
                          : row.status === "warning"
                            ? "warning"
                            : "success"
                      }
                      dot
                    />
                  ),
                },
              ]}
              rows={decisionRows}
              maxRows={6}
            />
          </ReportSection>
        )}

        {/* Cleaning Issues Callout List */}
        {issues.length > 0 && (
          <ReportSection title="Data Quality Alerts">
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {issues.slice(0, 3).map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 1fr auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 12px",
                    background: "var(--rpt-surface2)",
                    borderRadius: 6,
                    border: "1px solid var(--rpt-border-light)",
                  }}
                >
                  <ReportBadge label={issue.severity} variant={issue.severity} dot />
                  <span style={{ fontSize: 10, color: "var(--rpt-ink)", fontWeight: 700 }}>
                    {issue.affectedColumns && issue.affectedColumns.length > 0 ? `[${issue.affectedColumns.join(", ")}] ` : ""}{issue.description}
                  </span>
                  <span style={{ fontSize: 9.5, color: "var(--rpt-text-muted)", fontFamily: "var(--rpt-font-mono)" }}>
                    {issue.action}
                  </span>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

      </div>
    </ReportPage>
  );
}
