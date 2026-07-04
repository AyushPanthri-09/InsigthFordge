/**
 * Report Engine — Data Assembly Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * ReportDataBuilder transforms a FullAnalysis object into a typed ReportDocument.
 *
 * This is a pure data transformation — no rendering, no React, no side effects.
 * Every page component receives exactly the data it needs from this builder.
 */

import type { FullAnalysis, AIInsight, ChartSpec } from "@/services/analytics/types";
import type {
  ReportDocument,
  P1ExecutiveData,
  P2PerformanceData,
  P3TrendsData,
  P4DataQualityData,
  P5AnomaliesData,
  P6ForecastData,
  P7RecommendationsData,
  AppendixData,
  ReportSeverity,
  PriorityLevel,
  EffortLevel,
} from "./types";
import { sanitizeReportValue } from "./report-sanitizer";

// ─── Aggressive Data Sanitizer ──────────────────────────────────────────────

function deepSanitizeStrings<T>(value: T): T {
  if (typeof value === "string") {
    // Remove ALL image[[ tags
    let sanitized = value.replace(/image\[\[[^\]]*\]\]/g, "");
    // Remove ALL table tags
    sanitized = sanitized.replace(/<table[\s\S]*?<\/table>/g, "");
    // Remove [object Object]
    sanitized = sanitized.replace(/\[object Object\]/g, "");
    // Remove any remaining HTML-like tags
    sanitized = sanitized.replace(/<[^>]*>/g, "");
    // Clean up whitespace
    sanitized = sanitized.replace(/\s+/g, " ").trim();
    return sanitized as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepSanitizeStrings(item)) as T;
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = deepSanitizeStrings((value as Record<string, unknown>)[key]);
      }
    }
    return result as T;
  }

  return value;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateReportId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `rpt_${hash.toString(36)}`;
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function domainLabel(domain: string): string {
  const map: Record<string, string> = {
    ecommerce: "E-Commerce",
    retail: "Retail",
    finance: "Finance",
    banking: "Banking",
    healthcare: "Healthcare",
    education: "Education",
    manufacturing: "Manufacturing",
    logistics: "Logistics & Supply Chain",
    hr: "Human Resources",
    marketing: "Marketing",
    saas: "SaaS",
    operations: "Operations",
    generic: "General Business",
  };
  return map[domain] ?? domain;
}

function uniqueStrings(values: string[], limit = values.length): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = value.replace(/\s+/g, " ").trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function uniqueBy<T>(values: T[], keyFn: (value: T) => string, limit = values.length): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const value of values) {
    const key = keyFn(value).replace(/\s+/g, " ").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function severityFromNullPct(nullPct: number): ReportSeverity {
  if (nullPct > 0.5) return "critical";
  if (nullPct > 0.25) return "warning";
  if (nullPct > 0.1) return "info";
  return "success";
}

type PrescriptiveDetail = {
  priority?: PriorityLevel;
  effort?: EffortLevel;
  expectedImpact?: string;
  riskOfInaction?: string;
  successMetric?: string;
  timeHorizon?: string;
};

function getPrescriptiveDetail(insight: AIInsight): PrescriptiveDetail | undefined {
  return (insight as { prescriptiveDetail?: PrescriptiveDetail }).prescriptiveDetail;
}

function extractPriority(insight: AIInsight): PriorityLevel {
  const detail = getPrescriptiveDetail(insight);
  if (detail?.priority) return detail.priority;
  if (insight.confidence >= 0.8) return "high";
  if (insight.confidence >= 0.6) return "medium";
  return "low";
}

function extractEffort(insight: AIInsight): EffortLevel {
  const detail = getPrescriptiveDetail(insight);
  if (detail?.effort) return detail.effort;
  return "medium";
}

function extractExpectedImpact(insight: AIInsight): string {
  const detail = getPrescriptiveDetail(insight);
  return detail?.expectedImpact ?? insight.summary;
}

function extractRiskOfInaction(insight: AIInsight): string {
  const detail = getPrescriptiveDetail(insight);
  return detail?.riskOfInaction ?? "Risk not quantified.";
}

function extractSuccessMetric(insight: AIInsight): string {
  const detail = getPrescriptiveDetail(insight);
  return detail?.successMetric ?? "Track KPI improvement over 90 days.";
}

function extractTimeHorizon(insight: AIInsight): string {
  const detail = getPrescriptiveDetail(insight);
  const map: Record<string, string> = {
    immediate: "Immediate (< 2 weeks)",
    short_term: "Short-term (1-3 months)",
    medium_term: "Medium-term (3-6 months)",
    long_term: "Long-term (6-12 months)",
  };
  return (detail?.timeHorizon ? map[detail.timeHorizon] : undefined) ?? "Short-term (1-3 months)";
}

/** Build a synthetic forecast chart spec from a TimeSeriesAnalysis */
function buildForecastChartSpec(
  ts: import("@/services/analytics/types").TimeSeriesAnalysis,
): ChartSpec {
  const historicalData = ts.periods.map((p) => ({
    period: p.period,
    actual: p.value,
    forecast: null as number | null,
    lower: null as number | null,
    upper: null as number | null,
  }));

  const forecastData = (ts.forecast?.nextPeriods ?? []).map((p) => ({
    period: p.period,
    actual: null as number | null,
    forecast: p.predicted,
    lower: p.lower,
    upper: p.upper,
  }));

  return {
    id: `forecast_${ts.measureColumn}`,
    type: "area",
    title: `${ts.measureColumn} - Trend & Forecast`,
    description: `${ts.overallTrend} trend / ${ts.totalGrowthPct >= 0 ? "+" : ""}${ts.totalGrowthPct.toFixed(1)}% total growth`,
    xKey: "period",
    yKeys: ["actual", "forecast"],
    data: [...historicalData, ...forecastData],
    insight: ts.narrative,
  };
}

// ─── Page builders ────────────────────────────────────────────────────────────

function buildP1(analysis: FullAnalysis, generatedAt: string): P1ExecutiveData {
  const topInvestigation = analysis.eda.investigations?.[0];
  const narrative = topInvestigation?.executiveNarrative;

  const scqa = narrative
    ? {
        situation: narrative.situation,
        complication: narrative.complication,
        question: narrative.question,
        answer: narrative.answer,
        outlook: narrative.outlook,
        recommendedAction: narrative.recommendedAction,
        headline: narrative.headline,
      }
    : {
        situation: analysis.understanding.summary,
        complication:
          analysis.cleaning.qualityScore < 80
            ? `Data quality score of ${analysis.cleaning.qualityScore}/100 indicates issues requiring attention before drawing conclusions.`
            : `The dataset presents ${analysis.eda.topFindings.length} key analytical findings across ${analysis.dataset.columnCount} dimensions.`,
        question: `What are the primary performance drivers and where should the business focus its attention?`,
        answer: analysis.analytics.executiveSummary,
        outlook:
          analysis.eda.timeSeriesAnalysis?.[0]?.narrative ??
          "Trend analysis requires time-series data to produce a forward outlook.",
        recommendedAction:
          analysis.analytics.prescriptive[0]?.recommendation ??
          "Review the recommendations section for prioritised actions.",
        headline: analysis.analytics.executiveSummary.split(".")[0] + ".",
      };

  const topRecommendations = uniqueBy(
    analysis.analytics.prescriptive,
    (i) => `${i.title}|${i.recommendation ?? i.summary}`,
    4,
  ).map((i) => ({
    title: i.title,
    summary: i.recommendation ?? i.summary,
    priority: extractPriority(i),
    effort: extractEffort(i),
  }));

  return {
    reportTitle: "Executive Analytics Report",
    datasetName: analysis.dataset.fileName.replace(/\.[^.]+$/, ""),
    generatedAt,
    domain: domainLabel(analysis.understanding.domain),
    domainConfidence: analysis.understanding.domainConfidence,
    rowCount: analysis.dataset.rowCount,
    columnCount: analysis.dataset.columnCount,
    businessHealthScore: analysis.analytics.businessHealthScore,
    executiveSummary: analysis.analytics.executiveSummary,
    scqa,
    topKpis: analysis.eda.kpis.slice(0, 6),
    topRecommendations,
    dataQualityScore: analysis.cleaning.qualityScore,
    warnings: analysis.understanding.warnings ?? [],
  };
}

function buildP2(analysis: FullAnalysis): P2PerformanceData {
  // Sanitize charts to remove image[[ placeholders
  const charts = analysis.eda.charts.slice(0, 4).map((chart) => {
    const data = (chart as any).data;
    if (typeof data === "string" && data.includes("image[[")) {
      return { ...chart, data: [] };
    }
    return chart;
  });

  return {
    kpis: analysis.eda.kpis,
    primaryCharts: charts,
    correlations: analysis.eda.correlations,
    descriptiveInsights: analysis.analytics.descriptive,
    domain: domainLabel(analysis.understanding.domain),
  };
}

function buildP3(analysis: FullAnalysis): P3TrendsData {
  const trendCharts = analysis.eda.charts
    .filter((c) => c.type === "area" || c.type === "line")
    .map((chart) => {
      const data = (chart as any).data;
      if (typeof data === "string" && data.includes("image[[")) {
        return { ...chart, data: [] };
      }
      return chart;
    });

  return {
    timeSeriesAnalysis: analysis.eda.timeSeriesAnalysis ?? [],
    trendCharts: trendCharts.slice(0, 3),
    diagnosticInsights: analysis.analytics.diagnostic,
    topFindings: uniqueStrings(analysis.eda.topFindings, 6),
    hasTimeData: (analysis.eda.timeSeriesAnalysis?.length ?? 0) > 0,
  };
}

function buildP4(analysis: FullAnalysis): P4DataQualityData {
  const issues = analysis.cleaning.issues;
  const daieDecisions = analysis.cleaning.issues
    .filter((i) => i.daieDecision)
    .map((i) => {
      const profile = analysis.understanding.columnProfiles.find(
        (p) => p.name === i.affectedColumns?.[0],
      );
      const nullPct = profile ? profile.nullCount / Math.max(1, analysis.dataset.rowCount) : 0;
      return {
        column: i.affectedColumns?.[0] ?? i.id,
        decision: i.daieDecision!,
        nullPct,
        severity: severityFromNullPct(nullPct),
      };
    });

  return {
    qualityScore: analysis.cleaning.qualityScore,
    rowsBefore: analysis.cleaning.rowsBefore,
    rowsAfter: analysis.cleaning.rowsAfter,
    rowsRemoved: analysis.cleaning.rowsBefore - analysis.cleaning.rowsAfter,
    notes: analysis.cleaning.notes,
    issues,
    daieDecisions,
    columnProfiles: analysis.understanding.columnProfiles,
    issuesByCategory: {
      critical: issues.filter((i) => i.severity === "critical"),
      warning: issues.filter((i) => i.severity === "warning"),
      info: issues.filter((i) => i.severity === "info"),
    },
  };
}

function buildP5(analysis: FullAnalysis): P5AnomaliesData {
  const extendedStats = analysis.eda.extendedStats ?? {};
  const anomalyColumns = Object.entries(extendedStats)
    .filter(([, s]) => s.anomalyCount > 0 || s.distributionShape !== "normal")
    .map(([col, s]) => ({
      column: col,
      anomalyCount: s.anomalyCount,
      distributionShape: s.distributionShape,
      explanation: s.distributionExplanation,
      zScoreThreshold: s.zScoreThreshold,
    }))
    .sort((a, b) => b.anomalyCount - a.anomalyCount);

  return {
    investigations: analysis.eda.investigations ?? [],
    rootCauseAnalyses: analysis.eda.rootCauseAnalyses ?? [],
    statisticalTests: analysis.eda.statisticalTests ?? [],
    extendedStats,
    anomalyColumns,
  };
}

function buildP6(analysis: FullAnalysis): P6ForecastData {
  const forecasts = (analysis.eda.timeSeriesAnalysis ?? [])
    .filter((ts) => ts.forecast)
    .map((ts) => ({
      measureColumn: ts.measureColumn,
      overallTrend: ts.overallTrend,
      totalGrowthPct: ts.totalGrowthPct,
      peakPeriod: ts.peakPeriod,
      troughPeriod: ts.troughPeriod,
      seasonalityDetected: ts.seasonalityDetected,
      method: ts.forecast!.method,
      confidence: ts.forecast!.confidence,
      nextPeriods: ts.forecast!.nextPeriods,
      assumptions: ts.forecast!.assumptions,
      risks: ts.forecast!.risks,
      chartSpec: buildForecastChartSpec(ts),
    }));

  return {
    forecasts,
    predictiveInsights: analysis.analytics.predictive,
    hasForecasts: forecasts.length > 0,
  };
}

function buildP7(analysis: FullAnalysis): P7RecommendationsData {
  const recommendations = uniqueBy(
    analysis.analytics.prescriptive,
    (i) => `${i.title}|${i.recommendation ?? i.summary}`,
    6,
  ).map((i) => ({
    id: i.id,
    title: i.title,
    observation: i.observation,
    recommendation: i.recommendation ?? i.summary,
    priority: extractPriority(i),
    effort: extractEffort(i),
    expectedImpact: extractExpectedImpact(i),
    riskOfInaction: extractRiskOfInaction(i),
    successMetric: extractSuccessMetric(i),
    timeHorizon: extractTimeHorizon(i),
    confidence: i.confidence,
  }));

  return {
    prescriptiveInsights: analysis.analytics.prescriptive,
    recommendations,
    executiveSummary: analysis.analytics.executiveSummary,
  };
}

function buildAppendix(analysis: FullAnalysis): AppendixData {
  return {
    columnProfiles: analysis.understanding.columnProfiles,
    statisticalTests: analysis.eda.statisticalTests ?? [],
    extendedStats: analysis.eda.extendedStats ?? {},
    relationships: analysis.understanding.relationships ?? [],
    domain: domainLabel(analysis.understanding.domain),
    datasetName: analysis.dataset.fileName,
    rowCount: analysis.dataset.rowCount,
    columnCount: analysis.dataset.columnCount,
  };
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildReportDocument(analysis: FullAnalysis): ReportDocument {
  // ✅ Step 1: Sanitize the entire input analysis object
  const sanitizedAnalysis = deepSanitizeStrings(analysis);

  const now = new Date();
  const generatedAt = formatDateTime(now);
  const reportId = generateReportId(
    `${sanitizedAnalysis.dataset.datasetId}|${sanitizedAnalysis.dataset.fileName}|${sanitizedAnalysis.dataset.rowCount}|${sanitizedAnalysis.dataset.columnCount}`,
  );

  const rawReport = {
    reportId,
    generatedAt,
    datasetName: sanitizedAnalysis.dataset.fileName.replace(/\.[^.]+$/, ""),
    fileName: sanitizedAnalysis.dataset.fileName,

    p1: buildP1(sanitizedAnalysis, generatedAt),
    p2: buildP2(sanitizedAnalysis),
    p3: buildP3(sanitizedAnalysis),
    p4: buildP4(sanitizedAnalysis),
    p5: buildP5(sanitizedAnalysis),
    p6: buildP6(sanitizedAnalysis),
    p7: buildP7(sanitizedAnalysis),
    appendix: buildAppendix(sanitizedAnalysis),
  };

  // DEBUG: Find where image[[ is coming from (BEFORE sanitization)
  const jsonString = JSON.stringify(rawReport);
  if (jsonString.includes("image[[")) {
    console.log("=== FOUND image[[ in data (BEFORE sanitization) ===");
    const matches = jsonString.match(/[^{,]*image\[\[[^\]]*\]\][^,}]*/g);
    console.log("Occurrences:", matches);
  }

  // Step 2: Sanitize again for safety (using the same deep sanitizer)
  const sanitized = deepSanitizeStrings(rawReport);
  const fullySanitized = sanitizeReportValue(sanitized);

  // DEBUG: After sanitization, check if image[[ still exists
  const sanitizedString = JSON.stringify(sanitized);
  if (sanitizedString.includes("image[[")) {
    console.log("=== image[[ STILL PRESENT AFTER sanitization ===");
    const matches = sanitizedString.match(/[^{,]*image\[\[[^\]]*\]\][^,}]*/g);
    console.log("Occurrences:", matches);
  } else {
    console.log("✅ image[[ removed successfully.");
  }

  return fullySanitized;
}
