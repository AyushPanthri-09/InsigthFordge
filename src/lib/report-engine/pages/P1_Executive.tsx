import React from "react";
import type { P1ExecutiveData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBlock } from "../primitives/ReportBlock";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportCallout } from "../primitives/ReportCallout";

const TOTAL_PAGES = 9;

function scoreColor(score: number): string {
  if (score >= 80) return "var(--rpt-success)";
  if (score >= 60) return "var(--rpt-warning)";
  return "var(--rpt-critical)";
}

function ScoreRing({ score, dark = false }: { score: number; dark?: boolean }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const fill = (Math.max(0, Math.min(100, score)) / 100) * circ;
  const color = dark ? "#2dd4bf" : scoreColor(score);
  const track = dark ? "rgba(255,255,255,0.18)" : "var(--rpt-surface3)";

  return (
    <svg
      width={112}
      height={112}
      viewBox="0 0 112 112"
      aria-label={`Score ${score} out of 100`}
    >
      <circle
        cx={56}
        cy={56}
        r={r}
        fill="none"
        stroke={track}
        strokeWidth={9}
      />
      <circle
        cx={56}
        cy={56}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 56 56)"
      />
      <text
        x={56}
        y={59}
        textAnchor="middle"
        fill={dark ? "#ffffff" : color}
        fontSize={24}
        fontWeight={850}
        fontFamily="var(--rpt-font)"
      >
        {score}
      </text>
      <text
        x={56}
        y={76}
        textAnchor="middle"
        fill={dark ? "rgba(255,255,255,0.62)" : "var(--rpt-text-muted)"}
        fontSize={8}
        fontWeight={800}
        fontFamily="var(--rpt-font)"
      >
        /100
      </text>
    </svg>
  );
}

function fmt(v: number | string): string {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function KpiMini({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rpt-kpi">
      <div className="rpt-kpi-label">{label}</div>
      <div className="rpt-kpi-value" style={{ fontSize: 20 }}>
        {value}
      </div>
      {sub && <div className="rpt-kpi-sub">{sub}</div>}
    </div>
  );
}

interface Props {
  data: P1ExecutiveData;
}

export function P1_Executive({ data }: Props) {
  const { scqa } = data;
  const qualityVariant =
    data.dataQualityScore >= 80
      ? "success"
      : data.dataQualityScore >= 60
        ? "warning"
        : "critical";

  return (
    <>
      <div className="rpt-page rpt-cover" data-page={1}>
        <div className="rpt-cover-grid-bg" />

        <div className="rpt-cover-hero">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 58,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #60a5fa, #2dd4bf)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#071634",
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                IF
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 850,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  InsightForge AI
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.62)",
                    marginTop: 2,
                  }}
                >
                  Board-ready analytics report
                </div>
              </div>
            </div>
            <div
              className="rpt-badge"
              style={{
                color: "#071634",
                background: "#ccfbf1",
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              Confidential
            </div>
          </div>

          <div style={{ maxWidth: 620 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 850,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#93c5fd",
                marginBottom: 12,
              }}
            >
              Executive intelligence package
            </div>
            <div
              className="rpt-h1"
              style={{ color: "#ffffff", fontSize: 42, lineHeight: 1.02 }}
            >
              {data.reportTitle}
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 20,
                color: "rgba(255,255,255,0.76)",
                fontWeight: 650,
              }}
            >
              {data.datasetName}
            </div>
          </div>

          <div
            style={{ display: "flex", gap: 8, marginTop: 26, flexWrap: "wrap" }}
          >
            <ReportBadge label={data.domain} variant="brand" />
            <ReportBadge
              label={`${Math.round(data.domainConfidence * 100)}% domain confidence`}
              variant="neutral"
            />
            <ReportBadge
              label={`${data.rowCount.toLocaleString()} rows`}
              variant="neutral"
            />
            <ReportBadge
              label={`${data.columnCount} columns`}
              variant="neutral"
            />
          </div>
        </div>

        <div className="rpt-cover-metric-band">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <ScoreRing score={data.businessHealthScore} dark />
            <div
              style={{
                fontSize: 9,
                fontWeight: 850,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.68)",
              }}
            >
              Health score
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 850,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#93c5fd",
                marginBottom: 8,
              }}
            >
              Executive summary
            </div>
            <div
              style={{
                fontSize: 15,
                lineHeight: 1.62,
                color: "rgba(255,255,255,0.82)",
              }}
            >
              {data.executiveSummary}
            </div>
          </div>
        </div>

        <div className="rpt-cover-card">
          <div className="rpt-grid rpt-grid-4" style={{ gap: 10 }}>
            {data.topKpis.slice(0, 4).map((k) => (
              <div
                key={k.id}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                <div
                  style={{
                    fontSize: 8.5,
                    fontWeight: 850,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.58)",
                  }}
                >
                  {k.label}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 22,
                    fontWeight: 850,
                    color: "#ffffff",
                    lineHeight: 1,
                  }}
                >
                  {fmt(k.value)}
                </div>
                {k.unit && (
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 9.5,
                      color: "rgba(255,255,255,0.58)",
                    }}
                  >
                    {k.unit}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rpt-page-footer">
          <span>InsightForge AI / Confidential</span>
          <span>Executive Analytics Report</span>
          <span className="rpt-page-number">1 / {TOTAL_PAGES}</span>
        </div>
        <div className="rpt-watermark">InsightForge</div>
      </div>

      <ReportPage
        pageNumber={2}
        totalPages={TOTAL_PAGES}
        title="Executive Briefing"
        subtitle="Decision narrative, outlook, actions, and data readiness"
        datasetName={data.datasetName}
        generatedAt={data.generatedAt}
      >
        <ReportSection title="Board Narrative">
          <div className="rpt-card-accent" style={{ marginBottom: 14 }}>
            <div className="rpt-label" style={{ marginBottom: 8 }}>
              Headline
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 850,
                lineHeight: 1.25,
                color: "var(--rpt-ink)",
                marginBottom: 16,
              }}
            >
              {scqa.headline}
            </div>
            <div className="rpt-grid rpt-grid-2" style={{ gap: 14 }}>
              {[
                { label: "Situation", text: scqa.situation },
                { label: "Complication", text: scqa.complication },
                { label: "Question", text: scqa.question },
                { label: "Answer", text: scqa.answer },
              ].map(({ label, text }) => (
                <div
                  key={label}
                  className="rpt-stat-tile"
                  style={{ background: "rgba(255,255,255,0.72)" }}
                >
                  <div className="rpt-label" style={{ marginBottom: 5 }}>
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 10.8,
                      color: "var(--rpt-text-muted)",
                      lineHeight: 1.55,
                    }}
                  >
                    {text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rpt-grid rpt-grid-2" style={{ gap: 12 }}>
            <ReportBlock title="Outlook" variant="sm">
              <div
                style={{
                  fontSize: 11,
                  color: "var(--rpt-text-muted)",
                  lineHeight: 1.58,
                  marginTop: 8,
                }}
              >
                {scqa.outlook}
              </div>
            </ReportBlock>
            <ReportBlock title="Recommended Next Move" variant="sm">
              <div
                style={{
                  fontSize: 11,
                  color: "var(--rpt-text-muted)",
                  lineHeight: 1.58,
                  marginTop: 8,
                }}
              >
                {scqa.recommendedAction}
              </div>
            </ReportBlock>
          </div>
        </ReportSection>

        <ReportSection title="Executive KPI Snapshot">
          <div className="rpt-grid rpt-grid-4" style={{ gap: 10 }}>
            {data.topKpis.slice(0, 4).map((k) => (
              <KpiMini
                key={k.id}
                label={k.label}
                value={fmt(k.value)}
                sub={k.unit}
              />
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Top Decisions">
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {data.topRecommendations.map((r, i) => (
              <div
                key={i}
                className="rpt-card-sm"
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr auto",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--rpt-brand-soft)",
                    color: "var(--rpt-brand-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <div className="rpt-h3" style={{ marginBottom: 4 }}>
                    {r.title}
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "var(--rpt-text-muted)",
                      lineHeight: 1.45,
                    }}
                  >
                    {r.summary}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 5,
                  }}
                >
                  <ReportBadge label={r.priority} variant={r.priority} dot />
                  <ReportBadge label={`${r.effort} effort`} variant="neutral" />
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Data Readiness">
          <div
            className="rpt-card-sm"
            style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr auto",
              alignItems: "center",
              gap: 18,
            }}
          >
            <ScoreRing score={data.dataQualityScore} />
            <div>
              <div className="rpt-h3" style={{ marginBottom: 6 }}>
                Quality posture
              </div>
              <div
                style={{
                  fontSize: 10.8,
                  color: "var(--rpt-text-muted)",
                  lineHeight: 1.55,
                }}
              >
                The report is calibrated against data completeness and cleaning
                outcomes before surfacing recommendations.
              </div>
              <div className="rpt-progress-track" style={{ marginTop: 12 }}>
                <div
                  className="rpt-progress-fill"
                  style={{ width: `${data.dataQualityScore}%` }}
                />
              </div>
            </div>
            <ReportBadge
              label={
                data.dataQualityScore >= 80
                  ? "Board ready"
                  : data.dataQualityScore >= 60
                    ? "Use with caveats"
                    : "High caution"
              }
              variant={qualityVariant}
              dot
            />
          </div>

          {data.warnings.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <ReportCallout
                title="Data Warnings"
                text={data.warnings.slice(0, 2).join(" / ")}
                severity="warning"
              />
            </div>
          )}
        </ReportSection>
      </ReportPage>
    </>
  );
}
