import React from "react";
import type { P1ExecutiveData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBlock } from "../primitives/ReportBlock";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportCallout } from "../primitives/ReportCallout";

interface Props {
  data: P1ExecutiveData;
  datasetName: string;
  generatedAt: string;
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--rpt-success)";
  if (score >= 60) return "var(--rpt-warning)";
  return "var(--rpt-critical)";
}

function HealthScoreGauge({ score }: { score: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const fill = (Math.max(0, Math.min(100, score)) / 100) * circ;
  const color = scoreColor(score);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <svg width={100} height={100} viewBox="0 0 112 112">
        <circle cx={56} cy={56} r={r} fill="none" stroke="var(--rpt-border-light)" strokeWidth={10} />
        <circle
          cx={56}
          cy={56}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 56 56)"
        />
        <text x={56} y={60} textAnchor="middle" fill="var(--rpt-ink)" fontSize={24} fontWeight={850}>
          {score}%
        </text>
      </svg>
      <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: "var(--rpt-text-muted)", marginTop: 6 }}>
        Health Index
      </div>
    </div>
  );
}

export function P2_ExecutiveSummary({ data, datasetName, generatedAt }: Props) {
  const { scqa } = data;

  return (
    <ReportPage
      pageNumber={2}
      totalPages={11}
      title="Executive Briefing & Summary"
      subtitle="Strategic performance briefing, key business signals, opportunities, and risk profiles"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        
        {/* Top summary layout */}
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 20, alignItems: "center" }}>
          <HealthScoreGauge score={data.businessHealthScore} />
          
          <div style={{ borderLeft: "3px solid var(--rpt-brand)", paddingLeft: 16 }}>
            <span
              style={{
                display: "block",
                fontSize: 9,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--rpt-brand)",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              Executive Summary
            </span>
            <p style={{ fontSize: 11.5, lineHeight: 1.55, color: "var(--rpt-ink)", margin: 0 }}>
              {data.executiveSummary}
            </p>
          </div>
        </div>

        {/* Top 3 Business Signals */}
        <ReportSection title="Top 3 Business Signals">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              {
                title: "1. Core Context",
                desc: scqa.situation || "Initial operational parameters detect baseline growth patterns.",
                badge: "Baseline"
              },
              {
                title: "2. Key Friction Point",
                desc: scqa.complication || "System signals anomalous variations requiring cleanup.",
                badge: "Friction"
              },
              {
                title: "3. Market Outlook",
                desc: scqa.outlook || "Dynamic projections forecast strong seasonal recovery trends.",
                badge: "Projection"
              }
            ].map((sig, i) => (
              <div
                key={i}
                style={{
                  background: "var(--rpt-surface2)",
                  border: "1px solid var(--rpt-border-light)",
                  borderRadius: 6,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 110,
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--rpt-brand-dark)" }}>{sig.title}</div>
                    <ReportBadge label={sig.badge} variant="neutral" />
                  </div>
                  <p style={{ fontSize: 10, color: "var(--rpt-text-muted)", lineHeight: 1.45, margin: 0 }}>
                    {sig.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Opportunity and Risk grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 14 }}>
          <ReportSection title="Strategic Business Opportunity">
            <ReportBlock title="Primary Strategic Opportunity" variant="default">
              <div style={{ fontSize: 11, color: "var(--rpt-ink)", lineHeight: 1.55 }}>
                {scqa.answer || "Execute targeted optimizations across high-margin driver metrics to unlock immediate revenue gains."}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <ReportBadge label="Impact: High" variant="success" dot />
                <ReportBadge label="Priority: Critical" variant="critical" dot />
              </div>
            </ReportBlock>
          </ReportSection>

          <ReportSection title="Risks and Warnings">
            <ReportBlock title="Identified Operations Risks" variant="default">
              <div style={{ fontSize: 10.5, color: "var(--rpt-text-muted)", lineHeight: 1.5 }}>
                {data.warnings && data.warnings.length > 0
                  ? data.warnings.slice(0, 2).join(" ")
                  : "No critical data validation failures detected, but anomaly frequencies in outlier records should be monitored."}
              </div>
              {data.warnings && data.warnings.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <ReportBadge label="Action Required" variant="warning" dot />
                </div>
              )}
            </ReportBlock>
          </ReportSection>
        </div>

        {/* Why it Matters & Business Impact */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <ReportSection title="Why It Matters">
            <div
              style={{
                background: "var(--rpt-brand-soft)",
                border: "1px solid rgba(21, 94, 239, 0.15)",
                borderRadius: 6,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--rpt-brand-dark)", marginBottom: 4 }}>
                Operational Rationale
              </div>
              <p style={{ fontSize: 10.2, color: "var(--rpt-text)", lineHeight: 1.5, margin: 0 }}>
                {scqa.recommendedAction || "Applying immediate structured action prevents duplicate leaks and optimizes overall workflow parameters."}
              </p>
            </div>
          </ReportSection>

          <ReportSection title="Estimated Business Impact">
            <div
              style={{
                background: "var(--rpt-accent-soft)",
                border: "1px solid rgba(15, 159, 143, 0.15)",
                borderRadius: 6,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--rpt-accent)", marginBottom: 4 }}>
                Performance Lift
              </div>
              <p style={{ fontSize: 10.2, color: "var(--rpt-text)", lineHeight: 1.5, margin: 0 }}>
                {scqa.outlook || "Implementing these optimization recommendations is projected to stabilize seasonal fluctuations and increase confidence."}
              </p>
            </div>
          </ReportSection>
        </div>

      </div>
    </ReportPage>
  );
}
