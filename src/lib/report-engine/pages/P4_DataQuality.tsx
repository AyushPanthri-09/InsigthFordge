import React from "react";
import type { P4DataQualityData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportGrid } from "../primitives/ReportGrid";
import { ReportBlock } from "../primitives/ReportBlock";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportTable } from "../primitives/ReportTable";
import { ReportCallout } from "../primitives/ReportCallout";

const TOTAL_PAGES = 9;

interface Props { data: P4DataQualityData; datasetName: string; generatedAt: string; }

export function P4_DataQuality({ data, datasetName, generatedAt }: Props) {
  const removedPct = data.rowsBefore > 0
    ? ((data.rowsRemoved / data.rowsBefore) * 100).toFixed(1)
    : "0";

  return (
    <ReportPage pageNumber={5} totalPages={TOTAL_PAGES} title="Data Quality" datasetName={datasetName} generatedAt={generatedAt}>
      {/* Score + stats */}
      <ReportSection title="Quality Overview">
        <ReportGrid cols={4} gap={10}>
          {[
            { label: "Quality Score",   value: `${data.qualityScore}/100` },
            { label: "Rows Before",     value: data.rowsBefore.toLocaleString() },
            { label: "Rows After",      value: data.rowsAfter.toLocaleString() },
            { label: "Rows Removed",    value: `${data.rowsRemoved.toLocaleString()} (${removedPct}%)` },
          ].map(({ label, value }) => (
            <div key={label} className="rpt-kpi">
              <div className="rpt-kpi-label">{label}</div>
              <div className="rpt-kpi-value" style={{ fontSize: 18 }}>{value}</div>
            </div>
          ))}
        </ReportGrid>

        <div style={{ marginTop: 12 }}>
          <div className="rpt-progress-track">
            <div className="rpt-progress-fill" style={{ width: `${data.qualityScore}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "var(--rpt-text-faint)" }}>
            <span>0</span><span>50</span><span>100</span>
          </div>
        </div>

        {data.notes && (
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.6 }}>{data.notes}</div>
        )}
      </ReportSection>

      {/* Issues by severity */}
      {data.issuesByCategory.critical.length > 0 && (
        <ReportSection title="Critical Issues">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.issuesByCategory.critical.map((issue) => (
              <ReportCallout key={issue.id} title={issue.title} text={issue.reasoning} severity="critical" />
            ))}
          </div>
        </ReportSection>
      )}

      {data.issuesByCategory.warning.length > 0 && (
        <ReportSection title="Warnings">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.issuesByCategory.warning.slice(0, 4).map((issue) => (
              <ReportCallout key={issue.id} title={issue.title} text={issue.reasoning} severity="warning" />
            ))}
          </div>
        </ReportSection>
      )}

      {/* DAIE decisions */}
      {data.daieDecisions.length > 0 && (
        <ReportSection title="AI Column Decisions (DAIE)">
          <ReportTable
            columns={[
              { key: "column",   header: "Column",   mono: true },
              { key: "nullPct",  header: "Null %",   align: "right",
                render: (r) => `${(Number(r.nullPct) * 100).toFixed(1)}%` },
              { key: "decision", header: "Decision",
                render: (r) => <ReportBadge label={String(r.decision)} variant="brand" /> },
              { key: "severity", header: "Severity",
                render: (r) => <ReportBadge label={String(r.severity)} variant={r.severity as any} dot /> },
            ]}
            rows={data.daieDecisions as any}
            maxRows={10}
          />
        </ReportSection>
      )}

      {/* Column profiles summary */}
      {data.columnProfiles.length > 0 && (
        <ReportSection title="Column Profiles">
          <ReportTable
            columns={[
              { key: "name",      header: "Column",    mono: true },
              { key: "dataType",  header: "Type" },
              { key: "nullCount", header: "Nulls",     align: "right" },
              { key: "uniqueCount", header: "Unique",  align: "right" },
            ]}
            rows={data.columnProfiles as any}
            maxRows={12}
          />
        </ReportSection>
      )}
    </ReportPage>
  );
}
