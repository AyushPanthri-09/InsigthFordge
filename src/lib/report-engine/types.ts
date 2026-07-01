/**
 * Report Engine — Type System
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines the complete typed contract between the data assembly layer
 * (ReportDataBuilder) and the layout/rendering layers (page components,
 * HtmlReportViewer, PdfRenderer).
 *
 * Every page receives exactly one typed data object — nothing more.
 * The renderer never touches FullAnalysis directly.
 */

import type {
  FullAnalysis,
  KPI,
  ChartSpec,
  CorrelationPair,
  CleaningIssue,
  AIInsight,
  TimeSeriesAnalysis,
  RootCauseAnalysis,
  StatisticalTest,
  InvestigationResult,
  ExtendedNumericStats,
  DAIEColumnDecision,
  ColumnProfile,
} from "@/services/analytics/types";

// ─── Re-export for convenience ────────────────────────────────────────────────
export type { FullAnalysis };

// ─── Severity levels used across report pages ────────────────────────────────
export type ReportSeverity = "critical" | "warning" | "info" | "success";

// ─── Effort / priority enums (mirrors PrescriptiveRecommendation) ─────────────
export type EffortLevel = "low" | "medium" | "high";
export type PriorityLevel = "critical" | "high" | "medium" | "low";

// ─── Page 1 — Executive Summary ───────────────────────────────────────────────
export interface P1ExecutiveData {
  reportTitle: string;
  datasetName: string;
  generatedAt: string;
  domain: string;
  domainConfidence: number;
  rowCount: number;
  columnCount: number;
  businessHealthScore: number;
  executiveSummary: string;
  /** SCQA narrative from the top investigation result, or synthesised */
  scqa: {
    situation: string;
    complication: string;
    question: string;
    answer: string;
    outlook: string;
    recommendedAction: string;
    headline: string;
  };
  topKpis: KPI[];
  topRecommendations: Array<{
    title: string;
    summary: string;
    priority: PriorityLevel;
    effort: EffortLevel;
  }>;
  dataQualityScore: number;
  warnings: string[];
}

// ─── Page 2 — Performance Dashboard ──────────────────────────────────────────
export interface P2PerformanceData {
  kpis: KPI[];
  primaryCharts: ChartSpec[];
  correlations: CorrelationPair[];
  descriptiveInsights: AIInsight[];
  domain: string;
}

// ─── Page 3 — Trends & Time Series ───────────────────────────────────────────
export interface P3TrendsData {
  timeSeriesAnalysis: TimeSeriesAnalysis[];
  trendCharts: ChartSpec[];
  diagnosticInsights: AIInsight[];
  topFindings: string[];
  hasTimeData: boolean;
}

// ─── Page 4 — Data Quality ────────────────────────────────────────────────────
export interface P4DataQualityData {
  qualityScore: number;
  rowsBefore: number;
  rowsAfter: number;
  rowsRemoved: number;
  notes: string;
  issues: CleaningIssue[];
  daieDecisions: Array<{
    column: string;
    decision: DAIEColumnDecision;
    nullPct: number;
    severity: ReportSeverity;
  }>;
  columnProfiles: ColumnProfile[];
  issuesByCategory: {
    critical: CleaningIssue[];
    warning: CleaningIssue[];
    info: CleaningIssue[];
  };
}

// ─── Page 5 — Anomalies & Root Cause ─────────────────────────────────────────
export interface P5AnomaliesData {
  investigations: InvestigationResult[];
  rootCauseAnalyses: RootCauseAnalysis[];
  statisticalTests: StatisticalTest[];
  extendedStats: Record<string, ExtendedNumericStats>;
  anomalyColumns: Array<{
    column: string;
    anomalyCount: number;
    distributionShape: string;
    explanation: string;
    zScoreThreshold: number;
  }>;
}

// ─── Page 6 — Forecast ────────────────────────────────────────────────────────
export interface P6ForecastData {
  forecasts: Array<{
    measureColumn: string;
    overallTrend: string;
    totalGrowthPct: number;
    peakPeriod: string;
    troughPeriod: string;
    seasonalityDetected: boolean;
    method: string;
    confidence: number;
    nextPeriods: Array<{
      period: string;
      predicted: number;
      lower: number;
      upper: number;
    }>;
    assumptions: string[];
    risks: string[];
    chartSpec: ChartSpec;
  }>;
  predictiveInsights: AIInsight[];
  hasForecasts: boolean;
}

// ─── Page 7 — Recommendations ────────────────────────────────────────────────
export interface P7RecommendationsData {
  prescriptiveInsights: AIInsight[];
  recommendations: Array<{
    id: string;
    title: string;
    observation: string;
    recommendation: string;
    priority: PriorityLevel;
    effort: EffortLevel;
    expectedImpact: string;
    riskOfInaction: string;
    successMetric: string;
    timeHorizon: string;
    confidence: number;
  }>;
  executiveSummary: string;
}

// ─── Appendix ─────────────────────────────────────────────────────────────────
export interface AppendixData {
  columnProfiles: ColumnProfile[];
  statisticalTests: StatisticalTest[];
  extendedStats: Record<string, ExtendedNumericStats>;
  relationships: Array<{ from: string; to: string; type: string; confidence: number }>;
  domain: string;
  datasetName: string;
  rowCount: number;
  columnCount: number;
}

// ─── Top-level Report Document ────────────────────────────────────────────────
/**
 * The complete typed report document produced by ReportDataBuilder.
 * This is the single source of truth for all 7 pages + appendix.
 * The renderer never reads FullAnalysis directly.
 */
export interface ReportDocument {
  /** Unique report ID for keying React components */
  reportId: string;
  /** ISO timestamp of report generation */
  generatedAt: string;
  /** Dataset file name (without extension) */
  datasetName: string;
  /** Full dataset file name */
  fileName: string;

  p1: P1ExecutiveData;
  p2: P2PerformanceData;
  p3: P3TrendsData;
  p4: P4DataQualityData;
  p5: P5AnomaliesData;
  p6: P6ForecastData;
  p7: P7RecommendationsData;
  appendix: AppendixData;
}

// ─── Page registry entry (used by HtmlReportViewer) ──────────────────────────
export interface ReportPageMeta {
  id: string;
  pageNumber: number;
  title: string;
  subtitle: string;
}
