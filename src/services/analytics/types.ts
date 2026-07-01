/**
 * InsightForge AI — Analytics Service Contract.
 *
 * This contract defines the complete interface between the frontend and the
 * analytics engine. The current `tsImplementation` provides a local fallback
 * for the MVP. A future FastAPI backend MUST implement this exact interface
 * (see `httpImplementation.ts`). The UI must never depend on which provider
 * is active.
 */

export type ColumnSemanticType =
  | "identifier"
  | "primary_key"
  | "foreign_key"
  | "datetime"
  | "date"
  | "categorical"
  | "ordinal"
  | "numeric_measure"
  | "currency"
  | "percentage"
  | "boolean"
  | "text"
  | "geo"
  | "email"
  | "url"
  | "unknown";

// ---------------------------------------------------------------------------
// Phase 1 — Business Intelligence Foundation: extended type vocabulary
// ---------------------------------------------------------------------------

/** High-level business category a column belongs to. */
export type BusinessColumnCategory =
  | "financial_metric"    // revenue, cost, margin, profit
  | "operational_metric" // units, quantity, count, volume
  | "time_dimension"     // dates, periods, fiscal calendar
  | "geo_dimension"      // region, country, city, territory
  | "entity_key"         // customer id, order id, product id
  | "descriptor"         // names, labels, free-text
  | "status_flag"        // boolean / enum status fields
  | "ratio_metric"       // rates, percentages, scores
  | "unknown";

/** How a column participates in a star/snowflake schema. */
export type SchemaRole =
  | "fact_measure"        // additive numeric measure in a fact table
  | "fact_degenerate"    // non-key, non-measure in a fact table (e.g. invoice number)
  | "dimension_attribute"// descriptive attribute in a dimension
  | "dimension_key"      // FK reference to a dimension
  | "primary_key"        // PK of a table
  | "date_key"           // date/time FK
  | "unknown";

/** Intelligence produced per-column by the Column Intelligence Engine. */
export interface ColumnIntelligence {
  /** Technical data type as detected by the parser/profiler. */
  technicalType: ColumnSemanticType;
  /** Business category inferred from name + values + domain context. */
  businessCategory: BusinessColumnCategory;
  /** Human-readable business meaning (e.g. "Customer order total in USD"). */
  businessMeaning: string;
  /** Star-schema role. */
  schemaRole: SchemaRole;
  /** Whether this column is a strong KPI candidate. */
  isKpiCandidate: boolean;
  /** Whether this column is suitable for time-series forecasting. */
  isForecastCandidate: boolean;
  /** Whether this column represents a geographic concept. */
  isGeographic: boolean;
  /** Tags describing business concepts (e.g. ["seasonality", "fiscal"]). */
  businessTags: string[];
  /** 0-1 confidence in the inferred meaning. */
  confidence: number;
  /** One-line rationale for the inference. */
  rationale: string;
}

/** Relationship between two columns discovered by the Relationship Discovery Engine. */
export interface ColumnRelationship {
  fromColumn: string;
  toColumn: string;
  /** Type of relationship discovered. */
  relationshipType:
    | "primary_key"
    | "foreign_key"
    | "date_hierarchy"   // e.g. Year → Quarter → Month
    | "geo_hierarchy"    // e.g. Country → State → City
    | "measure_dimension"// e.g. Amount aggregated by Region
    | "parent_child"     // self-referential hierarchy
    | "lookup"           // code → label mapping
    | "correlated";      // statistical correlation
  confidence: number;
  rationale: string;
}

/** Business process inferred for the dataset (e.g. Order-to-Cash). */
export interface BusinessProcess {
  name: string;
  description: string;
  /** Columns that participate in this process. */
  involvedColumns: string[];
  confidence: number;
}

/** Time intelligence extracted from date/datetime columns. */
export interface TimeIntelligence {
  /** The primary date column driving timeline analysis. */
  primaryDateColumn: string;
  /** Detected time granularity of the primary date column. */
  granularity: "day" | "week" | "month" | "quarter" | "year" | "mixed";
  /** Whether the data shows seasonal patterns (heuristic). */
  hasSeasonalitySignal: boolean;
  /** Earliest date found in the dataset (ISO string). */
  dateRangeStart?: string;
  /** Latest date found in the dataset (ISO string). */
  dateRangeEnd?: string;
  /** Span in days. */
  spanDays?: number;
  /** Secondary date columns (e.g. delivery date, return date). */
  secondaryDateColumns: string[];
}

export type BusinessDomain =
  | "ecommerce"
  | "retail"
  | "finance"
  | "banking"
  | "healthcare"
  | "education"
  | "manufacturing"
  | "logistics"
  | "hr"
  | "marketing"
  | "saas"
  | "operations"
  | "generic";

export interface ParsedDataset {
  fileName: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  /** First 1000 rows as plain object array. Full dataset kept in-memory by service. */
  preview: Record<string, unknown>[];
  /** Reference id usable on subsequent calls (e.g. backend session). */
  datasetId: string;
}

export interface ColumnProfile {
  name: string;
  inferredType: ColumnSemanticType;
  inferredRole: "dimension" | "measure" | "key" | "date" | "metadata";
  nonNullCount: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues: unknown[];
  /** AI-inferred business meaning, e.g. "Customer order total in USD". */
  businessMeaning?: string;
  stats?: NumericStats;

  // -----------------------------------------------------------------------
  // Phase 1 additions — optional, backward compatible
  // -----------------------------------------------------------------------

  /** Rich semantic intelligence for this column. */
  intelligence?: ColumnIntelligence;
}

export interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdev: number;
  q1: number;
  q3: number;
  outlierCount: number;
}

// ---------------------------------------------------------------------------
// Phase 2 — Analytical Intelligence Layer: extended type vocabulary
// ---------------------------------------------------------------------------

/**
 * Full statistical profile for a numeric column.
 * Extends NumericStats with distribution shape and anomaly metrics.
 * Optional — only computed when the Statistical Engine runs.
 */
export interface ExtendedNumericStats extends NumericStats {
  /** Pearson skewness: >0 right-skewed, <0 left-skewed. */
  skewness: number;
  /** Excess kurtosis: >0 heavy-tailed, <0 light-tailed. */
  kurtosis: number;
  /** Coefficient of variation (stdev / mean). Dimensionless spread measure. */
  coefficientOfVariation: number;
  /** 95% confidence interval for the mean [lower, upper]. */
  confidenceInterval95: [number, number];
  /** Z-score threshold used for anomaly detection (typically 2.5–3.0). */
  zScoreThreshold: number;
  /** Number of values flagged as anomalies by z-score method. */
  anomalyCount: number;
  /** Detected distribution shape. */
  distributionShape: "normal" | "right_skewed" | "left_skewed" | "bimodal" | "uniform" | "unknown";
  /** Plain-English business explanation of the distribution. */
  distributionExplanation: string;
  /** Percentile breakdown: p5, p10, p25, p50, p75, p90, p95. */
  percentiles: Record<string, number>;
  /** Trend strength measured on normalised data (0 = flat, 1 = perfect trend). */
  trendStrength?: number;
}

/** Result of a statistical hypothesis test. */
export interface StatisticalTest {
  testName: string;
  statistic: number;
  /** p-value (0–1). Below 0.05 = statistically significant. */
  pValue: number;
  isSignificant: boolean;
  /** Plain-English interpretation of the test result. */
  interpretation: string;
  /** Business implication of the test result. */
  businessImplication: string;
}

/** Time-series period summary (one bucket in a trend). */
export interface TimeSeriesPeriod {
  period: string;
  value: number;
  /** Growth rate vs previous period (%). */
  growthRate?: number;
  /** Simple moving average centred on this period. */
  movingAverage?: number;
  /** Whether this period is flagged as an anomaly. */
  isAnomaly: boolean;
  /** z-score of this period's value relative to the series mean. */
  zScore?: number;
}

/** Full time-series analysis result for one measure column. */
export interface TimeSeriesAnalysis {
  measureColumn: string;
  dateColumn: string;
  granularity: string;
  periods: TimeSeriesPeriod[];
  /** Overall trend direction across the full series. */
  overallTrend: "growing" | "declining" | "flat" | "volatile";
  /** Overall growth rate first→last period (%). */
  totalGrowthPct: number;
  /** Peak period label. */
  peakPeriod: string;
  /** Trough period label. */
  troughPeriod: string;
  /** Whether the series shows a repeating seasonal pattern. */
  seasonalityDetected: boolean;
  /** Months or periods that are consistently high (1-indexed). */
  highSeasonPeriods: number[];
  /** Forecast for the next N periods. */
  forecast?: ForecastResult;
  /** Plain-English narrative for this time series. */
  narrative: string;
}

/** Lightweight forecast result (no ML models — pure statistical). */
export interface ForecastResult {
  /** Method used: moving_average | exponential_smoothing | holt_trend. */
  method: "moving_average" | "exponential_smoothing" | "holt_trend";
  /** Forecast values for the next periods. */
  nextPeriods: Array<{ period: string; predicted: number; lower: number; upper: number }>;
  /** 0–1 confidence in the forecast. */
  confidence: number;
  /** Assumptions made by the forecast model. */
  assumptions: string[];
  /** Risks that could invalidate the forecast. */
  risks: string[];
}

/** One node in a root-cause analysis tree. */
export interface RootCauseNode {
  /** The observed outcome being investigated. */
  observation: string;
  /** Column examined at this level. */
  column: string;
  /** Top-N segments that explain the observation. */
  segments: Array<{
    value: string;
    contribution: number;  // % of the total effect
    delta: number;         // absolute difference from dataset average
    isTopContributor: boolean;
  }>;
  /** Ranked hypotheses for WHY this column drives the observation. */
  hypotheses: Array<{
    statement: string;
    evidenceType: "dataset" | "inference";
    confidence: number;
  }>;
  /** Recursively drill into the top contributor segment. */
  children?: RootCauseNode[];
}

/** Full root-cause analysis for one metric anomaly. */
export interface RootCauseAnalysis {
  targetMetric: string;
  targetValue: number;
  baselineValue: number;
  /** Positive = above baseline, negative = below. */
  deviation: number;
  deviationPct: number;
  /** Ordered list of dimensions examined as root causes. */
  dimensionsExamined: string[];
  rootCauses: RootCauseNode[];
  /** Final plain-English conclusion. */
  conclusion: string;
  /** Confidence in the root cause identification (0–1). */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Phase 2.5 — Autonomous Investigation Engine types
// ---------------------------------------------------------------------------

/**
 * A single investigative question generated by the Investigation Engine.
 * Each question targets one variable and records the dataset evidence found.
 */
export interface InvestigativeQuestion {
  /** The question being asked (e.g. "Was discount higher in peak periods?"). */
  question: string;
  /** Which column was examined to answer this question. */
  targetColumn: string;
  /** Type of analysis performed. */
  analysisType: "segment_comparison" | "correlation" | "distribution_shift" | "temporal_pattern" | "group_difference";
  /** What the data actually shows in answer to this question. */
  dataAnswer: string;
  /** Numeric evidence value (e.g. correlation r, mean difference, %). */
  evidenceValue?: number;
  /** Whether the answer supports the finding being investigated. */
  supportsMainFinding: boolean;
  /** Strength of the evidence: strong | moderate | weak | none. */
  evidenceStrength: "strong" | "moderate" | "weak" | "none";
  /** Confidence in this specific answer (0–1). */
  confidence: number;
}

/**
 * A hypothesis that has been formally tested against dataset evidence.
 * All hypotheses are either supported, rejected, or inconclusive.
 */
export interface TestedHypothesis {
  id: string;
  /** Plain-English statement of what this hypothesis claims. */
  statement: string;
  /** Questions asked to test this hypothesis. */
  questions: InvestigativeQuestion[];
  /** Evidence that supports this hypothesis. */
  supportingEvidence: Array<{ description: string; strength: number }>;
  /** Evidence that contradicts this hypothesis. */
  opposingEvidence: Array<{ description: string; strength: number }>;
  /** Final verdict after weighing all evidence. */
  verdict: "supported" | "rejected" | "inconclusive";
  /** One-sentence rationale for the verdict. */
  rationale: string;
  /** 0–1 confidence in this verdict. */
  confidence: number;
  /** Rank among surviving hypotheses (1 = strongest). null if rejected. */
  rank: number | null;
}

/**
 * One driver in the ranked importance matrix.
 */
export interface DriverImportance {
  /** Column name. */
  column: string;
  /** Human-readable label. */
  label: string;
  /** Percentage contribution to the observed outcome (0–100). */
  contributionPct: number;
  /** Absolute metric impact attributed to this driver. */
  absoluteImpact: number;
  /** Evidence type: purely from dataset computations. */
  evidenceType: "dataset" | "inference";
  /** Whether this driver was statistically significant. */
  isSignificant: boolean;
  /** How the driver was measured (e.g. segment mean delta, correlation). */
  measurementMethod: string;
}

/**
 * Full investigation result for one key finding.
 * This is the output of the Autonomous Investigation Engine.
 */
export interface InvestigationResult {
  /** The original observation being investigated. */
  finding: string;
  /** The metric column at the centre of this investigation. */
  targetMetric: string;
  /** The observed value triggering the investigation. */
  observedValue: number;
  /** Dataset baseline (mean) for comparison. */
  baselineValue: number;
  /** Deviation from baseline (%). */
  deviationPct: number;
  /** All investigative questions asked and answered. */
  questions: InvestigativeQuestion[];
  /** All hypotheses tested with full evidence chains. */
  hypotheses: TestedHypothesis[];
  /** Ranked driver importance matrix. */
  driverImportance: DriverImportance[];
  /** Surviving hypotheses ranked by evidence strength. */
  leadingHypotheses: TestedHypothesis[];
  /** Hypotheses that were formally rejected with reason. */
  rejectedHypotheses: TestedHypothesis[];
  /** Final conclusion synthesised from surviving hypotheses. */
  conclusion: string;
  /** Overall confidence in the investigation conclusion (0–1). */
  confidence: number;
  /** Structured executive narrative for this finding. */
  executiveNarrative: ExecutiveNarrative;
}

/**
 * SCQA-structured executive narrative.
 * Situation → Complication → Question → Answer (McKinsey Pyramid Principle).
 */
export interface ExecutiveNarrative {
  /** What happened (factual, dataset-based). */
  situation: string;
  /** Why it matters / what makes it unusual. */
  complication: string;
  /** The key business question this raises. */
  question: string;
  /** The evidence-backed answer. */
  answer: string;
  /** What is likely to happen next (from forecast data). */
  outlook: string;
  /** The recommended action tied to this specific finding. */
  recommendedAction: string;
  /** One-sentence executive summary suitable for a board slide. */
  headline: string;
}

/**
 * Multi-factor confidence breakdown for an insight.
 * Replaces the single-number confidence score with a transparent breakdown.
 */
export interface ConfidenceBreakdown {
  /** Overall composite confidence (0–1). */
  overall: number;
  /** Component scores. */
  factors: {
    /** How complete is the underlying data? (0–1) */
    dataCompleteness: number;
    /** Is the sample large enough to be reliable? (0–1) */
    sampleSize: number;
    /** Is the finding statistically significant? (0–1) */
    statisticalSignificance: number;
    /** How strong is the data quality after cleaning? (0–1) */
    dataQuality: number;
    /** How consistent is the evidence across multiple signals? (0–1) */
    evidenceConsistency: number;
  };
  /** Plain-English explanation of the overall score. */
  explanation: string;
}

/**
 * Executive-grade prescriptive recommendation.
 * Replaces the plain recommendation string with a structured consultant output.
 */
export interface PrescriptiveRecommendation {
  /** One-sentence action statement. */
  action: string;
  /** Expected business outcome if the action is taken. */
  expectedImpact: string;
  /** Effort required: low | medium | high. */
  effort: "low" | "medium" | "high";
  /** Priority: critical | high | medium | low. */
  priority: "critical" | "high" | "medium" | "low";
  /** Key risks if the action is NOT taken. */
  riskOfInaction: string;
  /** How to measure success of this recommendation. */
  successMetric: string;
  /** Approximate time horizon: immediate | short_term | medium_term | long_term. */
  timeHorizon: "immediate" | "short_term" | "medium_term" | "long_term";
  /** Other actions this depends on. */
  dependencies?: string[];
  /** Confidence this recommendation will produce the expected impact. */
  confidence: number;
}

export interface DatasetUnderstanding {
  datasetId: string;
  domain: BusinessDomain;
  domainConfidence: number; // 0-1
  summary: string; // 2-4 sentence natural-language overview
  purpose: string; // what this dataset is used for
  primaryEntities: string[]; // e.g. ["Customer", "Order", "Product"]
  suggestedKPIs: Array<{ name: string; rationale: string; columns: string[] }>;
  columnProfiles: ColumnProfile[];
  relationships: Array<{ from: string; to: string; type: string; confidence: number }>;
  warnings: string[];

  // -----------------------------------------------------------------------
  // Phase 1 additions — all optional so existing code never breaks
  // -----------------------------------------------------------------------

  /** Per-column intelligence produced by the Column Intelligence Engine. */
  columnIntelligence?: Record<string, ColumnIntelligence>;

  /** Structural relationships discovered by the Relationship Discovery Engine. */
  columnRelationships?: ColumnRelationship[];

  /** Business processes inferred for this dataset. */
  businessProcesses?: BusinessProcess[];

  /** Time intelligence extracted from date columns. */
  timeIntelligence?: TimeIntelligence;

  /** Natural-language explanation of HOW the domain was inferred. */
  domainRationale?: string;

  /**
   * Fact vs dimension classification for each column.
   * Key = column name, value = "fact" | "dimension" | "unknown".
   */
  factDimensionMap?: Record<string, "fact" | "dimension" | "unknown">;

  /** Detected measure columns with their aggregation hints. */
  measures?: Array<{
    column: string;
    aggregation: "sum" | "avg" | "count" | "max" | "min" | "rate";
    unit?: string;
    businessMeaning: string;
  }>;

  /** Detected dimension columns with their hierarchy hints. */
  dimensions?: Array<{
    column: string;
    hierarchy?: string[];   // e.g. ["Country", "Region", "City"]
    cardinality: "low" | "medium" | "high";
    businessMeaning: string;
  }>;
}

export type CleaningSeverity = "info" | "warning" | "critical";
export type CleaningAction =
  | "drop_duplicates"
  | "drop_column"
  | "drop_rows"
  | "fill_missing"
  | "convert_type"
  | "strip_whitespace"
  | "standardize_case"
  | "normalize_empty_strings_to_null"
  | "validate_email"
  | "normalize_phone_numbers"
  | "remove_outliers"
  | "flag_only"
  | "treat_as_metadata";

export interface DAIETransformationOption {
  option: "keep_as_is" | "impute" | "transform" | "drop";
  label: string;
  reasoning: string;
  risk: string;
}

export interface DAIEColumnDecision {
  column: string;
  role: string;
  dependency: string;
  businessImportance: string;
  statisticalProfile: string;
  dataQuality: string;
  optionsConsidered: DAIETransformationOption[];
  finalDecision: "keep" | "drop" | "transform" | "impute" | "flag_for_review";
  justification: string;
  riskAssessment: string;
  rejectedOptions: string[];
}

export interface CleaningIssue {
  id: string;
  severity: CleaningSeverity;
  action: CleaningAction;
  title: string;
  description: string;
  reasoning: string; // why a senior data scientist would do this
  confidence: number; // 0-1
  affectedRows?: number;
  affectedColumns?: string[];
  businessImpact: string;
  /** Whether the system will auto-apply or requires user approval. */
  requiresApproval: boolean;
  applied?: boolean;

  // -----------------------------------------------------------------------
  // Phase 1 additions — Data Quality Intelligence
  // -----------------------------------------------------------------------

  /**
   * Ranked list of possible causes for why this data quality issue exists.
   * Each cause has a plain-language description and a plausibility score.
   */
  possibleCauses?: Array<{
    cause: string;
    plausibility: number; // 0-1
    evidence: string;
  }>;

  /** Alternative interpretations that should be considered before acting. */
  alternativeInterpretations?: string[];

  /** Data Analytics Intelligence Engine decision stack for this column/action. */
  daieDecision?: DAIEColumnDecision;
}

export interface CleaningReport {
  datasetId: string;
  issues: CleaningIssue[];
  rowsBefore: number;
  rowsAfter: number;
  qualityScore: number; // 0-100
  notes: string;
}

export interface KPI {
  id: string;
  label: string;
  value: number | string;
  formattedValue: string;
  unit?: string;
  trend?: { direction: "up" | "down" | "flat"; pct: number };
  confidence: number;
  rationale: string;
}

export type ChartType = "bar" | "line" | "area" | "pie" | "scatter" | "histogram" | "heatmap";

export interface ChartSpec {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  xKey: string;
  yKeys: string[];
  data: Record<string, unknown>[];
  insight?: string;
}

export interface CorrelationPair {
  a: string;
  b: string;
  r: number; // Pearson
  strength: "weak" | "moderate" | "strong";
}

export interface EDAReport {
  datasetId: string;
  kpis: KPI[];
  charts: ChartSpec[];
  correlations: CorrelationPair[];
  distributions: Array<{ column: string; chart: ChartSpec }>;
  topFindings: string[];

  // -----------------------------------------------------------------------
  // Phase 2 additions — all optional, backward compatible
  // -----------------------------------------------------------------------

  /** Extended statistical profiles for numeric columns. */
  extendedStats?: Record<string, ExtendedNumericStats>;

  /** Time-series analysis results keyed by measure column name. */
  timeSeriesAnalysis?: TimeSeriesAnalysis[];

  /** Root-cause analyses for anomalous findings. */
  rootCauseAnalyses?: RootCauseAnalysis[];

  /** Statistical tests performed during EDA. */
  statisticalTests?: StatisticalTest[];

  /** Phase 2.5: Autonomous investigation results per key finding. */
  investigations?: InvestigationResult[];
}

export type InsightLevel = "descriptive" | "diagnostic" | "predictive" | "prescriptive";

export interface Evidence {
  type: "dataset" | "external" | "inference";
  description: string;
  weight: number; // 0-1
  source?: string;
}

export interface Hypothesis {
  statement: string;
  /** Evidence in the dataset (or external context) that supports this hypothesis. */
  supportingEvidence: Evidence[];
  /** Evidence that contradicts or weakens this hypothesis. */
  opposingEvidence: Evidence[];
  verdict: "supported" | "rejected" | "inconclusive";
  /** Plain-language reason for the verdict — why supported / rejected / inconclusive. */
  rationale: string;
  confidence: number;
  /** 1 = top-ranked surviving cause. Rejected hypotheses may share rank 0. */
  rank?: number;
}

export interface AIInsight {
  id: string;
  level: InsightLevel;
  title: string;
  /** The factual observation from the data that triggered this insight. */
  observation: string;
  summary: string;
  reasoning: string;
  /**
   * Senior-DS multi-hypothesis reasoning. REQUIRED for every important insight.
   * Must contain at least 2 competing hypotheses, each with supporting AND
   * opposing evidence and an explicit verdict.
   */
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  confidence: number; // 0-1
  /** Final conclusion derived from surviving hypotheses. */
  conclusion: string;
  /** Actionable, business-grade next step. */
  recommendation: string;
  assumptions?: string[];
  limitations?: string[];
  relatedColumns?: string[];

  // -----------------------------------------------------------------------
  // Phase 2 additions — optional, backward compatible
  // -----------------------------------------------------------------------

  /** Structured multi-factor confidence breakdown. */
  confidenceBreakdown?: ConfidenceBreakdown;

  /** Structured prescriptive recommendation (richer than plain string). */
  prescriptiveDetail?: PrescriptiveRecommendation;

  /** Root cause analysis if this insight has a known anomaly driver. */
  rootCause?: RootCauseAnalysis;
}

export interface AnalyticsReport {
  datasetId: string;
  descriptive: AIInsight[];
  diagnostic: AIInsight[];
  predictive: AIInsight[];
  prescriptive: AIInsight[];
  businessHealthScore: number; // 0-100
  executiveSummary: string;
}

export interface ReasoningStep {
  timestamp: number;
  phase: "understanding" | "profiling" | "cleaning" | "eda" | "analytics" | "reporting";
  message: string;
  detail?: string;
}

export interface AnalystNotes {
  /** Free-form user-provided guidance. Never mandatory. */
  text: string;
}

export interface AnalyzeOptions {
  notes?: AnalystNotes;
  onProgress?: (step: ReasoningStep) => void;
}

/**
 * The full analytics service interface. A FastAPI backend must mirror this
 * shape via REST; the TS implementation provides it in-process.
 */
export interface AnalyticsService {
  parseFile(file: File): Promise<ParsedDataset>;
  understandDataset(datasetId: string, notes?: AnalystNotes): Promise<DatasetUnderstanding>;
  proposeCleaning(datasetId: string, notes?: AnalystNotes): Promise<CleaningReport>;
  applyCleaning(datasetId: string, issueIds: string[]): Promise<CleaningReport>;
  runEDA(datasetId: string, notes?: AnalystNotes): Promise<EDAReport>;
  runAnalytics(datasetId: string, notes?: AnalystNotes): Promise<AnalyticsReport>;
  /** Convenience: full pipeline orchestrator. */
  analyzeAll(file: File, options?: AnalyzeOptions): Promise<FullAnalysis>;
}

export interface FullAnalysis {
  dataset: ParsedDataset;
  understanding: DatasetUnderstanding;
  cleaning: CleaningReport;
  eda: EDAReport;
  analytics: AnalyticsReport;
  reasoningLog: ReasoningStep[];
}
