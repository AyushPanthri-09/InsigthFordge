import React from "react";
import type { P2PerformanceData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportChart } from "../primitives/ReportChart";
import { ReportExecutiveInsight } from "../primitives/ReportExecutiveInsight";
import { ReportHeroMetric } from "../primitives/ReportHeroMetric";
import { ReportInsightCard } from "../primitives/ReportInsightCard";
import { ReportSectionHeader } from "../primitives/ReportSectionHeader";
import { ReportSummaryTile } from "../primitives/ReportSummaryTile";

interface Props {
  data: P2PerformanceData;
  datasetName: string;
  generatedAt: string;
  businessHealthScore?: number;
  dataQualityScore?: number;
}

function fmt(v: number | string): string {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export function P4_KPIDashboard({ data, datasetName, generatedAt, businessHealthScore = 85, dataQualityScore = 95 }: Props) {
  const { kpis } = data;

  const isNumericKPI = (kpi: (typeof kpis)[number]) => Number.isFinite(Number(kpi.value));
  const labelIs = (kpi: (typeof kpis)[number], labels: string[]) =>
    labels.some((label) => kpi.label.trim().toLowerCase() === label || kpi.id.trim().toLowerCase() === label);
  const labelIncludes = (kpi: (typeof kpis)[number], terms: string[]) => {
    const text = `${kpi.label} ${kpi.id}`.toLowerCase();
    return terms.some((term) => text.includes(term));
  };

  const exactRevenue = kpis.find((kpi) => labelIs(kpi, ["revenue", "total revenue", "sales"]) && isNumericKPI(kpi));
  const exactProfit = kpis.find((kpi) => labelIs(kpi, ["profit", "net income"]) && isNumericKPI(kpi));
  const firstNumeric = kpis.find(isNumericKPI);
  const heroKPI = exactRevenue ?? exactProfit;
  const heroMetric = heroKPI
    ? {
        label: heroKPI.label,
        value: heroKPI.formattedValue || fmt(heroKPI.value),
        caption: heroKPI.rationale,
        trend: undefined as number | undefined,
      }
    : {
        label: "Business Health",
        value: `${businessHealthScore}%`,
        caption: "Weighted operational readiness index.",
        trend: undefined as number | undefined,
      };

  const preferredSupport = [
    { terms: ["order"], fallbackLabel: "Orders" },
    { terms: ["customer"], fallbackLabel: "Customers" },
    { terms: ["average order", "aov"], fallbackLabel: "AOV" },
    { terms: ["growth"], fallbackLabel: "Growth" },
  ];

  const usedIds = new Set(heroKPI ? [heroKPI.id] : []);
  const supportFromLabels = preferredSupport
    .map((candidate) => {
      const match = kpis.find((kpi) => !usedIds.has(kpi.id) && isNumericKPI(kpi) && labelIncludes(kpi, candidate.terms));
      if (match) usedIds.add(match.id);
      return match
        ? {
            label: match.label,
            value: match.formattedValue || fmt(match.value),
            caption: match.rationale,
          }
        : undefined;
    })
    .filter(Boolean) as Array<{ label: string; value: string; caption?: string }>;

  const remainingNumeric = kpis
    .filter((kpi) => !usedIds.has(kpi.id) && isNumericKPI(kpi))
    .slice(0, Math.max(0, 4 - supportFromLabels.length))
    .map((kpi) => ({
      label: kpi.label,
      value: kpi.formattedValue || fmt(kpi.value),
      caption: kpi.rationale,
    }));

  const supportingMetrics = [...supportFromLabels, ...remainingNumeric].slice(0, 4);
  if (supportingMetrics.length < 4) {
    supportingMetrics.push(
      {
        label: "Data Quality",
        value: `${dataQualityScore}%`,
        caption: "Input readiness score.",
      },
      {
        label: "Business Health",
        value: `${businessHealthScore}%`,
        caption: "Executive operating index.",
      },
    );
  }

  const executiveInsight =
    data.descriptiveInsights[0]?.summary ||
    `Overall ${data.domain} performance is summarized through revenue, order, customer, profitability, and quality indicators.`;
  const primaryInsight = data.descriptiveInsights[0];

  return (
    <ReportPage
      pageNumber={4}
      totalPages={11}
      title="Performance KPI Dashboard"
      subtitle={`Core dashboard summarizing performance indices for ${data.domain}`}
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--rpt-space-xl, 32px)" }}>
        <ReportSectionHeader
          eyebrow="Status Page"
          title="Performance KPI Dashboard"
          description={`Core performance posture for ${data.domain}.`}
        />

        <ReportExecutiveInsight
          insight={executiveInsight}
          impact={heroMetric.caption || "Primary indicators are ready for executive review."}
          confidence={businessHealthScore}
          status={businessHealthScore >= 80 ? "success" : businessHealthScore >= 60 ? "warning" : "critical"}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "var(--rpt-space-xl, 32px)" }}>

          <ReportHeroMetric
            label={heroMetric.label}
            value={heroMetric.value}
            trend={heroMetric.trend}
            variant={businessHealthScore >= 80 ? "success" : "primary"}
            badge="Hero KPI"
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--rpt-space-md, 16px)", height: "100%" }}>
            {supportingMetrics.slice(0, 4).map((metric, index) => (
            <ReportSummaryTile
                key={`${metric.label}-${index}`}
                label={metric.label}
                value={metric.value}
                caption={metric.caption}
                tone={index === 0 ? "primary" : "neutral"}
              />
            ))}
          </div>
        </div>

        {data.primaryCharts && data.primaryCharts.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: "var(--rpt-space-xl, 32px)", marginTop: "var(--rpt-space-lg, 24px)" }}>
            <div className="rpt-card" style={{ padding: 16, minHeight: 338 }}>
              <div style={{ fontSize: 12, fontWeight: 850, color: "var(--rpt-brand-dark)", marginBottom: 10 }}>
                {data.primaryCharts[0].title}
              </div>
              <div className="rpt-chart-panel" style={{ height: 280 }}>
                <ReportChart spec={data.primaryCharts[0]} height={280} />
              </div>
            </div>
            <ReportInsightCard title={primaryInsight?.title || "Executive Readout"} badge="AI Insight">
              <p style={{ margin: 0 }}>
                {primaryInsight?.summary || "No narrative insight was generated for this KPI set."}
              </p>
            </ReportInsightCard>
          </div>
        )}
      </div>
    </ReportPage>
  );
}
