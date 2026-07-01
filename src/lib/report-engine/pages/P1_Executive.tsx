import React from "react";
import type { P1ExecutiveData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportGrid } from "../primitives/ReportGrid";
import { ReportBlock } from "../primitives/ReportBlock";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportCallout } from "../primitives/ReportCallout";

const TOTAL_PAGES = 9;

function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 75 ? "var(--rpt-success)" : score >= 50 ? "var(--rpt-warning)" : "var(--rpt-critical)";
  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="var(--rpt-surface2)" strokeWidth={7} />
      <circle
        cx={45} cy={45} r={r} fill="none"
        stroke={color} strokeWidth={7}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
      />
      <text x={45} y={49} textAnchor="middle" fill={color} fontSize={18} fontWeight={800} fontFamily="var(--rpt-font)">{score}</text>
    </svg>
  );
}

function KpiMini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rpt-kpi">
      <div className="rpt-kpi-label">{label}</div>
      <div className="rpt-kpi-value" style={{ fontSize: 20 }}>{value}</div>
      {sub && <div className="rpt-kpi-sub">{sub}</div>}
    </div>
  );
}

function fmt(v: number | string): string {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

interface Props { data: P1ExecutiveData; }

export function P1_Executive({ data }: Props) {
  const { scqa } = data;

  return (
    <>
      {/* ── Cover page ─────────────────────────────────────────────────────── */}
      <div className="rpt-page rpt-cover" data-page={1}>
        <div className="rpt-cover-grid-bg" />
        <div className="rpt-cover-glow" />

        {/* Hero */}
        <div className="rpt-cover-hero">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, var(--rpt-brand), var(--rpt-accent))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>✦</div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--rpt-brand-light)" }}>
              InsightForge AI
            </div>
          </div>

          <div className="rpt-h1" style={{ fontSize: 36, maxWidth: 560 }}>{data.reportTitle}</div>
          <div style={{ marginTop: 12, fontSize: 16, color: "var(--rpt-text-muted)", fontWeight: 500 }}>
            {data.datasetName}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
            <ReportBadge label={data.domain} variant="brand" />
            <ReportBadge label={`${Math.round(data.domainConfidence * 100)}% confidence`} variant="neutral" />
            <ReportBadge label={`${data.rowCount.toLocaleString()} rows`} variant="neutral" />
            <ReportBadge label={`${data.columnCount} columns`} variant="neutral" />
          </div>

          <div style={{ marginTop: 32, fontSize: 11, color: "var(--rpt-text-faint)" }}>
            Generated {data.generatedAt} · Confidential
          </div>
        </div>

        {/* Score strip */}
        <div style={{ padding: "32px var(--rpt-page-pad)", display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <ScoreRing score={data.businessHealthScore} />
            <div className="rpt-label">Health Score</div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="rpt-h3" style={{ marginBottom: 8 }}>Executive Summary</div>
            <div style={{ fontSize: 12, color: "var(--rpt-text-muted)", lineHeight: 1.7 }}>
              {data.executiveSummary}
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ padding: "0 var(--rpt-page-pad) 32px" }}>
          <div className="rpt-grid rpt-grid-4" style={{ gap: 10 }}>
            {data.topKpis.slice(0, 4).map((k) => (
              <KpiMini key={k.id} label={k.label} value={fmt(k.value)} sub={k.unit} />
            ))}
          </div>
        </div>

        {/* Warnings */}
        {data.warnings.length > 0 && (
          <div style={{ padding: "0 var(--rpt-page-pad)" }}>
            <ReportCallout
              title="Data Warnings"
              text={data.warnings.slice(0, 2).join(" · ")}
              severity="warning"
            />
          </div>
        )}

        {/* Footer */}
        <div className="rpt-page-footer">
          <span>InsightForge AI · Confidential</span>
          <span>Executive Analytics Report</span>
          <span className="rpt-page-number">1 / {TOTAL_PAGES}</span>
        </div>
        <div className="rpt-watermark">InsightForge</div>
      </div>

      {/* ── Page 2: SCQA + Recommendations ────────────────────────────────── */}
      <ReportPage
        pageNumber={2}
        totalPages={TOTAL_PAGES}
        title="Executive Summary"
        subtitle="SCQA Narrative"
        datasetName={data.datasetName}
        generatedAt={data.generatedAt}
      >
        <ReportSection title="Situation · Complication · Question · Answer">
          <div className="rpt-card-accent" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12, lineHeight: 1.3 }}>
              {scqa.headline}
            </div>
            <div className="rpt-grid rpt-grid-2" style={{ gap: 16 }}>
              {[
                { label: "Situation",   text: scqa.situation },
                { label: "Complication", text: scqa.complication },
                { label: "Question",    text: scqa.question },
                { label: "Answer",      text: scqa.answer },
              ].map(({ label, text }) => (
                <div key={label}>
                  <div className="rpt-label" style={{ marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.6 }}>{text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rpt-grid rpt-grid-2" style={{ gap: 12 }}>
            <ReportBlock title="Outlook" variant="sm">
              <div style={{ fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.6, marginTop: 8 }}>{scqa.outlook}</div>
            </ReportBlock>
            <ReportBlock title="Recommended Action" variant="sm">
              <div style={{ fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.6, marginTop: 8 }}>{scqa.recommendedAction}</div>
            </ReportBlock>
          </div>
        </ReportSection>

        <ReportSection title="Top Recommendations">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.topRecommendations.map((r, i) => (
              <div key={i} className="rpt-card-sm" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: "linear-gradient(135deg, var(--rpt-brand), var(--rpt-accent))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "#fff",
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div className="rpt-h3">{r.title}</div>
                    <ReportBadge label={r.priority} variant={r.priority} dot />
                    <ReportBadge label={`${r.effort} effort`} variant="neutral" />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--rpt-text-muted)", lineHeight: 1.5 }}>{r.summary}</div>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Data quality score */}
        <ReportSection title="Data Quality">
          <div className="rpt-card-sm" style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div>
              <div className="rpt-kpi-label">Quality Score</div>
              <div className="rpt-kpi-value">{data.dataQualityScore}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--rpt-text-muted)" }}>/100</span></div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="rpt-progress-track">
                <div className="rpt-progress-fill" style={{ width: `${data.dataQualityScore}%` }} />
              </div>
            </div>
            <ReportBadge
              label={data.dataQualityScore >= 80 ? "Good" : data.dataQualityScore >= 60 ? "Fair" : "Poor"}
              variant={data.dataQualityScore >= 80 ? "success" : data.dataQualityScore >= 60 ? "warning" : "critical"}
              dot
            />
          </div>
        </ReportSection>
      </ReportPage>
    </>
  );
}
