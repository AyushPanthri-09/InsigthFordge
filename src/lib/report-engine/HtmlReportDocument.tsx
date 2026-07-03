import React from "react";
import type { ChartSpec, KPI } from "@/services/analytics/types";
import type { ReportDocument } from "./types";
import { ReportPage } from "./primitives/ReportPage";
import { ReportChart } from "./primitives/ReportChart";
import { ReportTable } from "./primitives/ReportTable";
import "./aa-theme.css";
interface Props {
  doc: ReportDocument;
}

const TOTAL_PAGES = 6;

function fmt(value: number | string | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "N/A");
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? n.toLocaleString() : n.toFixed(2);
}

function pct(value: number | undefined): string {
  const n = Number(value ?? 0);
  const normalized = n <= 1 ? n * 100 : n;
  return `${Math.round(normalized)}%`;
}

function short(text: string | undefined, fallback: string, limit = 210): string {
  const value = (text || fallback).replace(/\s+/g, " ").trim();
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function primaryKpi(doc: ReportDocument): KPI | undefined {
  const revenue = doc.p2.kpis.find((kpi) =>
    /revenue|sales|amount|profit|orders|quantity/i.test(`${kpi.label} ${kpi.id}`),
  );
  return revenue ?? doc.p2.kpis[0];
}

function kpiTiles(doc: ReportDocument, count = 8) {
  const hero = primaryKpi(doc);
  const base = doc.p2.kpis
    .filter((kpi) => kpi.id !== hero?.id)
    .map((kpi) => ({
      label: kpi.label,
      value: kpi.formattedValue || fmt(kpi.value),
      note: kpi.rationale,
    }));

  return [
    {
      label: hero?.label || "Business Health",
      value: hero?.formattedValue || `${doc.p1.businessHealthScore}%`,
      note: hero?.rationale || "Primary performance indicator.",
    },
    ...base,
    { label: "Records", value: doc.p1.rowCount.toLocaleString(), note: "Analyzed rows." },
    { label: "Features", value: String(doc.p1.columnCount), note: "Dataset columns." },
    { label: "Data Quality", value: `${doc.p1.dataQualityScore}%`, note: "Cleaning readiness score." },
    { label: "Health Score", value: `${doc.p1.businessHealthScore}%`, note: "Composite business posture." },
  ].slice(0, count);
}

function PageLead({
  eyebrow,
  title,
  purpose,
}: {
  eyebrow: string;
  title: string;
  purpose: string;
}) {
  return (
    <div className="aa-lead">
      <div>
        <div className="aa-eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      <p>{purpose}</p>
    </div>
  );
}

function NoteBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="aa-note">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

function KpiGrid({ items, columns = 4 }: { items: ReturnType<typeof kpiTiles>; columns?: 2 | 3 | 4 | 5 }) {
  return (
    <div className={`aa-kpi-grid aa-kpi-grid-${columns}`}>
      {items.map((item, index) => (
        <div className="aa-kpi" key={`${item.label}-${index}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{short(item.note, "Performance indicator.", 68)}</p>
        </div>
      ))}
    </div>
  );
}

function ChartBox({
  spec,
  title,
  height = 220,
}: {
  spec?: ChartSpec;
  title: string;
  height?: number;
}) {
  return (
    <div className="aa-panel aa-chart-box">
      <div className="aa-panel-head">
        <strong>{spec?.title || title}</strong>
        <span>{spec?.type ? `${spec.type} chart` : "visual"}</span>
      </div>
      {spec ? (
        <ReportChart spec={spec} height={height} />
      ) : (
        <div className="aa-empty" style={{ height }}>
          No chartable data available for this section.
        </div>
      )}
    </div>
  );
}

function InsightTriplet({ doc }: { doc: ReportDocument }) {
  return (
    <div className="aa-triplet">
      <NoteBox title="What happened">
        {short(doc.p1.scqa?.situation || doc.p1.executiveSummary, "The uploaded dataset was analyzed across performance, quality, drivers, risks, forecast, and actions.")}
      </NoteBox>
      <NoteBox title="Why it matters">
        {short(doc.p1.scqa?.complication || doc.p1.scqa?.question, "The report connects metrics to business impact so the reader can prioritize decisions instead of reading disconnected numbers.")}
      </NoteBox>
      <NoteBox title="What to do next">
        {short(doc.p1.scqa?.recommendedAction || doc.p7.executiveSummary, "Focus on the highest-priority recommendations and validate anomalies before scaling decisions.")}
      </NoteBox>
    </div>
  );
}

function Heatmap({ doc }: { doc: ReportDocument }) {
  const correlations = doc.p2.correlations ?? [];
  const cols = Array.from(new Set(correlations.flatMap((c) => [c.a, c.b]))).slice(0, 5);

  if (cols.length < 2) {
    return <div className="aa-empty" style={{ height: 200 }}>Correlation matrix needs at least two numeric fields.</div>;
  }

  return (
    <div className="aa-heatmap" style={{ gridTemplateColumns: `112px repeat(${cols.length}, 1fr)` }}>
      <div />
      {cols.map((col) => (
        <div className="aa-heatmap-head" key={`head-${col}`}>{col}</div>
      ))}
      {cols.map((row) => (
        <React.Fragment key={row}>
          <div className="aa-heatmap-row">{row}</div>
          {cols.map((col) => {
            const pair = correlations.find(
              (c) => (c.a === row && c.b === col) || (c.a === col && c.b === row),
            );
            const value = row === col ? 1 : pair?.r ?? 0;
            const alpha = Math.max(0.12, Math.min(0.88, Math.abs(value)));
            const background =
              value < 0 ? `rgba(139, 28, 28, ${alpha})` : `rgba(0, 153, 168, ${alpha})`;
            return (
              <div
                className="aa-heatmap-cell"
                style={{ background, color: alpha > 0.42 ? "#fff" : "var(--rpt-navy)" }}
                key={`${row}-${col}`}
              >
                {value.toFixed(2)}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

export function HtmlReportDocument({ doc }: Props) {
  const shared = { datasetName: doc.datasetName, generatedAt: doc.generatedAt };
  const mainChart = doc.p2.primaryCharts[0] ?? doc.p3.trendCharts[0];
  const secondChart = doc.p2.primaryCharts[1] ?? doc.p3.trendCharts[1] ?? doc.p2.primaryCharts[0];
  const forecast = doc.p6.forecasts[0];
  const anomalyChart: ChartSpec | undefined = doc.p5.anomalyColumns.length
    ? {
        id: "aa-anomalies",
        type: "bar",
        title: "Outliers by Column",
        description: "Anomaly concentration by field",
        xKey: "column",
        yKeys: ["anomalyCount"],
        data: doc.p5.anomalyColumns.map((item) => ({
          column: item.column,
          anomalyCount: item.anomalyCount,
        })),
      }
    : undefined;
  const sortedRecommendations = [...doc.p7.recommendations].slice(0, 5);

  return (
    <div className="rpt-document aa-report">
      <ReportPage
        pageNumber={1}
        totalPages={TOTAL_PAGES}
        title="Data Analysis Report"
        subtitle={doc.datasetName}
        {...shared}
      >
        <div className="aa-stack">
          <div className="aa-title-block">
            <div className="aa-logo-word">InsightForge<span>AI</span></div>
            <h1>{doc.p1.reportTitle || "Data Analysis Report"}</h1>
            <p>{doc.datasetName}</p>
          </div>

          <div className="aa-purpose">
            <strong>Purpose</strong>
            <p>
              To turn raw performance data into a clear client-friendly story: what happened,
              why it happened, and what should happen next.
            </p>
          </div>

          <KpiGrid items={kpiTiles(doc, 6)} columns={3} />
          <div className="aa-two">
            <ChartBox spec={mainChart} title="Primary Performance Trend" height={230} />
            <div className="aa-panel aa-summary-panel">
              <div className="aa-panel-head">
                <strong>Quick Summary</strong>
                <span>{doc.p1.domain}</span>
              </div>
              <p>{short(doc.p1.executiveSummary, doc.p1.scqa?.headline || "Executive summary unavailable.", 520)}</p>
              <div className="aa-mini-facts">
                <span>Rows: {doc.p1.rowCount.toLocaleString()}</span>
                <span>Features: {doc.p1.columnCount}</span>
                <span>Health: {doc.p1.businessHealthScore}%</span>
                <span>Quality: {doc.p1.dataQualityScore}%</span>
              </div>
            </div>
          </div>
          <InsightTriplet doc={doc} />
        </div>
      </ReportPage>

      <ReportPage
        pageNumber={2}
        totalPages={TOTAL_PAGES}
        title="Performance Overview"
        subtitle="Metrics, visual trends, and KPI context."
        {...shared}
      >
        <div className="aa-stack">
          <PageLead
            eyebrow="Performance"
            title="What changed in the data?"
            purpose="Start with the highest-signal measures, then read the charts and KPI table together."
          />
          <div className="aa-two aa-two-even">
            <ChartBox spec={mainChart} title="Performance Trend" height={250} />
            <ChartBox spec={secondChart} title="Secondary Performance View" height={250} />
          </div>
          <KpiGrid items={kpiTiles(doc, 8)} columns={4} />
          <ReportTable
            striped
            columns={[
              { key: "metric", header: "Metric" },
              { key: "value", header: "Value", align: "right" },
              { key: "interpretation", header: "Interpretation" },
            ]}
            rows={kpiTiles(doc, 6).map((item) => ({
              metric: item.label,
              value: item.value,
              interpretation: short(item.note, "KPI generated from uploaded data.", 110),
            }))}
          />
        </div>
      </ReportPage>

      <ReportPage
        pageNumber={3}
        totalPages={TOTAL_PAGES}
        title="Drivers & Correlations"
        subtitle="Why performance moved and which variables are connected."
        {...shared}
      >
        <div className="aa-stack">
          <PageLead
            eyebrow="Analytics"
            title="Why did it happen?"
            purpose="Correlation does not prove causation, but it highlights where to investigate first."
          />
          <div className="aa-panel">
            <div className="aa-panel-head">
              <strong>Correlation Heatmap</strong>
              <span>Pearson r</span>
            </div>
            <Heatmap doc={doc} />
          </div>
          <div className="aa-two">
            <ReportTable
              striped
              columns={[
                { key: "driver", header: "Positive Driver" },
                { key: "r", header: "r", align: "right" },
                { key: "strength", header: "Strength" },
              ]}
              rows={(doc.p2.correlations ?? [])
                .filter((c) => c.r > 0)
                .sort((a, b) => b.r - a.r)
                .slice(0, 5)
                .map((c) => ({
                  driver: `${c.a} -> ${c.b}`,
                  r: `+${c.r.toFixed(2)}`,
                  strength: c.strength,
                }))}
            />
            <ReportTable
              striped
              columns={[
                { key: "driver", header: "Opposing Driver" },
                { key: "r", header: "r", align: "right" },
                { key: "strength", header: "Strength" },
              ]}
              rows={(doc.p2.correlations ?? [])
                .filter((c) => c.r < 0)
                .sort((a, b) => a.r - b.r)
                .slice(0, 5)
                .map((c) => ({
                  driver: `${c.a} -> ${c.b}`,
                  r: c.r.toFixed(2),
                  strength: c.strength,
                }))}
            />
          </div>
          <InsightTriplet doc={doc} />
        </div>
      </ReportPage>

      <ReportPage
        pageNumber={4}
        totalPages={TOTAL_PAGES}
        title="Risks & Data Quality"
        subtitle="Anomalies, quality checks, and records that need attention."
        {...shared}
      >
        <div className="aa-stack">
          <PageLead
            eyebrow="Risk Review"
            title="What could mislead decisions?"
            purpose="Before acting on insights, review data quality, outliers, and statistical flags."
          />
          <div className="aa-two">
            <ChartBox spec={anomalyChart} title="Outliers by Column" height={225} />
            <KpiGrid
              items={[
                { label: "Anomaly Fields", value: String(doc.p5.anomalyColumns.length), note: "Columns with outliers." },
                { label: "Exception Rows", value: fmt(doc.p5.anomalyColumns.reduce((sum, item) => sum + item.anomalyCount, 0)), note: "Flagged records." },
                { label: "Quality Score", value: `${doc.p4.qualityScore}%`, note: "Post-cleaning score." },
                { label: "Rows Removed", value: doc.p4.rowsRemoved.toLocaleString(), note: "Cleaning impact." },
              ]}
              columns={2}
            />
          </div>
          <ReportTable
            striped
            columns={[
              { key: "field", header: "Field" },
              { key: "outliers", header: "Outliers", align: "right" },
              { key: "shape", header: "Shape" },
              { key: "interpretation", header: "Business Interpretation" },
            ]}
            rows={doc.p5.anomalyColumns.slice(0, 6).map((item) => ({
              field: item.column,
              outliers: item.anomalyCount.toLocaleString(),
              shape: item.distributionShape,
              interpretation: short(item.explanation, "Outlier concentration requires review.", 130),
            }))}
          />
          <ReportTable
            striped
            columns={[
              { key: "issue", header: "Quality Issue" },
              { key: "severity", header: "Severity", align: "center" },
              { key: "impact", header: "Impact" },
            ]}
            rows={doc.p4.issues.slice(0, 5).map((issue) => ({
              issue: issue.title,
              severity: issue.severity,
              impact: short(issue.businessImpact || issue.reasoning, "Quality issue detected.", 140),
            }))}
          />
        </div>
      </ReportPage>

      <ReportPage
        pageNumber={5}
        totalPages={TOTAL_PAGES}
        title="Forecast & Outlook"
        subtitle="What may happen next and how confident the model is."
        {...shared}
      >
        <div className="aa-stack">
          <PageLead
            eyebrow="Forecast"
            title="What comes next?"
            purpose="Use forecast direction as planning guidance, then validate it against current risk signals."
          />
          <ChartBox spec={forecast?.chartSpec} title="Forecast Trend" height={330} />
          <KpiGrid
            items={[
              { label: "Target", value: forecast?.measureColumn || "N/A", note: "Forecasted measure." },
              { label: "Confidence", value: forecast ? pct(forecast.confidence) : "N/A", note: forecast?.method || "Model confidence." },
              { label: "Growth", value: forecast ? `${forecast.totalGrowthPct.toFixed(1)}%` : "N/A", note: forecast?.overallTrend || "Trend direction." },
              { label: "Peak Period", value: forecast?.peakPeriod || "N/A", note: "Highest modeled period." },
            ]}
            columns={4}
          />
          <ReportTable
            striped
            columns={[
              { key: "period", header: "Period" },
              { key: "predicted", header: "Predicted", align: "right" },
              { key: "lower", header: "Lower", align: "right" },
              { key: "upper", header: "Upper", align: "right" },
            ]}
            rows={(forecast?.nextPeriods ?? []).slice(0, 6).map((period) => ({
              period: period.period,
              predicted: fmt(period.predicted),
              lower: fmt(period.lower),
              upper: fmt(period.upper),
            }))}
          />
          <div className="aa-two">
            <NoteBox title="Assumptions">
              {short(forecast?.assumptions.slice(0, 3).join(" "), "Forecast assumptions depend on the stability and chronology of the available data.", 240)}
            </NoteBox>
            <NoteBox title="Risks">
              {short(forecast?.risks.slice(0, 3).join(" "), "Forecast direction should be interpreted with anomaly and quality constraints.", 240)}
            </NoteBox>
          </div>
        </div>
      </ReportPage>

      <ReportPage
        pageNumber={6}
        totalPages={TOTAL_PAGES}
        title="Action Plan"
        subtitle="What to do next, how to measure it, and technical context."
        {...shared}
      >
        <div className="aa-stack">
          <PageLead
            eyebrow="Recommendations"
            title="What should happen next?"
            purpose="Each recommendation is tied to observed data, expected impact, timeline, and confidence."
          />
          <ReportTable
            striped
            columns={[
              { key: "priority", header: "Priority" },
              { key: "action", header: "Action" },
              { key: "impact", header: "Impact" },
              { key: "timeline", header: "Timeline" },
              { key: "confidence", header: "Confidence", align: "right" },
            ]}
            rows={(sortedRecommendations.length
              ? sortedRecommendations
              : doc.p1.topRecommendations.map((item, index) => ({
                  id: `fallback-${index}`,
                  priority: item.priority,
                  title: item.title,
                  recommendation: item.summary,
                  expectedImpact: item.priority === "critical" || item.priority === "high" ? "High" : "Medium",
                  timeHorizon: item.effort === "low" ? "30 days" : "60-90 days",
                  confidence: 0.82,
                } as (typeof sortedRecommendations)[number]))
            ).slice(0, 6).map((item) => ({
              priority: item.priority,
              action: item.title || item.recommendation,
              impact: item.expectedImpact,
              timeline: item.timeHorizon || "90 days",
              confidence: pct(item.confidence),
            }))}
          />
          <div className="aa-two">
            <NoteBox title="Client-friendly takeaway">
              {short(doc.p7.executiveSummary || doc.p1.scqa?.recommendedAction, "The report should support a decision, not just present numbers.", 260)}
            </NoteBox>
            <NoteBox title="Technical appendix">
              Dataset: {doc.appendix.rowCount.toLocaleString()} rows, {doc.appendix.columnCount} features.
              Domain: {doc.appendix.domain}. Methods include KPI profiling, visual EDA, Pearson
              correlations, anomaly detection, and forecasting where supported.
            </NoteBox>
          </div>
          <div className="aa-closing">
            <strong>InsightForge AI / Confidential</strong>
            <span>(c) 2026 InsightForge AI. All rights reserved.</span>
          </div>
        </div>
      </ReportPage>
    </div>
  );
}
