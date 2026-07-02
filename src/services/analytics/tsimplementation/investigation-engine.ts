/**
 * Investigation Engine
 * --------------------
 * The core of Phase 2.5 — Autonomous Investigation.
 *
 * Performance patch (P3):
 *  - generateInvestigativeQuestions() now accepts an optional ColumnCache.
 *  - askCorrelationQuestion() reads from cache.numericVectors and
 *    cache.correlationCache — no row scan when cache is present.
 *  - askDistributionShiftQuestion() delegates distribution math to the
 *    Statistical Engine.
 *  - All other question types are unchanged (segment breakdown now uses
 *    cache.numericVectors when available, falling back to computeSegmentBreakdown).
 */

import type {
  ColumnProfile,
  InvestigativeQuestion,
  TimeSeriesAnalysis,
} from "../types";
import {
  computeCorrelationCached,
  computeDistributionShiftCached,
  computeSegmentBreakdownCached,
} from "./statistical-engine";
import type { ColumnCache } from "./eda";

// ---------------------------------------------------------------------------
// Question generation — dynamic, column-driven
// ---------------------------------------------------------------------------

/**
 * Generates the full list of investigative questions for a given finding.
 *
 * @param metricCol     - The metric column showing the anomaly
 * @param anomalyValue  - The observed anomalous value
 * @param baseline      - Dataset-wide mean of the metric
 * @param profiles      - All column profiles
 * @param rows          - All dataset rows
 * @param timeSeries    - Time series analysis (if available)
 * @param domain        - Business domain
 * @param cache         - Pre-built column cache (eliminates redundant row scans)
 */
export function generateInvestigativeQuestions(
  metricCol: string,
  anomalyValue: number,
  baseline: number,
  profiles: ColumnProfile[],
  rows: Record<string, unknown>[],
  timeSeries?: TimeSeriesAnalysis | null,
  domain = "generic",
  cache?: ColumnCache,
): InvestigativeQuestion[] {
  const questions: InvestigativeQuestion[] = [];
  const deviation = anomalyValue - baseline;
  const isPositive = deviation > 0;

  // ── Q-type 1: Dimension segment questions ────────────────────────────────
  const dimensions = profiles.filter(
    (p) =>
      (p.inferredRole === "dimension" ||
        p.inferredType === "categorical" ||
        p.inferredType === "boolean") &&
      p.uniqueCount >= 2 &&
      p.uniqueCount <= 30 &&
      p.name !== metricCol,
  );

  for (const dim of dimensions.slice(0, 8)) {
    const q = askSegmentQuestion(
      metricCol,
      dim.name,
      anomalyValue,
      baseline,
      rows,
      isPositive,
      cache,
    );
    if (q) questions.push(q);
  }

  // ── Q-type 2: Numeric correlation questions ──────────────────────────────
  const measures = profiles.filter(
    (p) => p.inferredRole === "measure" && p.stats && p.name !== metricCol,
  );

  for (const m of measures.slice(0, 5)) {
    const q = askCorrelationQuestion(metricCol, m.name, rows, cache);
    if (q) questions.push(q);
  }

  // ── Q-type 3: Temporal pattern questions ─────────────────────────────────
  if (timeSeries) {
    questions.push(askSeasonalityQuestion(timeSeries, metricCol));
    questions.push(askTrendQuestion(timeSeries, metricCol));
    if (timeSeries.periods.some((p) => p.isAnomaly)) {
      questions.push(askAnomalyFrequencyQuestion(timeSeries, metricCol));
    }
  }

  // ── Q-type 4: Distribution shift questions ───────────────────────────────
  const distributionQuestion = askDistributionShiftQuestion(
    metricCol,
    anomalyValue,
    rows,
    cache,
  );
  if (distributionQuestion) questions.push(distributionQuestion);

  return questions;
}

// ---------------------------------------------------------------------------
// Individual question answerers
// ---------------------------------------------------------------------------

function askSegmentQuestion(
  metricCol: string,
  dimensionCol: string,
  anomalyValue: number,
  baseline: number,
  rows: Record<string, unknown>[],
  isPositive: boolean,
  cache?: ColumnCache,
): InvestigativeQuestion | null {
  const segments = computeSegmentBreakdownCached(
    rows,
    cache,
    dimensionCol,
    metricCol,
    baseline,
  );
  if (segments.length < 2) return null;

  const top = segments[0];
  const secondBest = segments[1];

  const dominanceRatio =
    secondBest.contribution > 0
      ? top.contribution / secondBest.contribution
      : 1;
  const evidenceStrength: InvestigativeQuestion["evidenceStrength"] =
    top.contribution > 30 && dominanceRatio > 2
      ? "strong"
      : top.contribution > 15
        ? "moderate"
        : top.contribution > 5
          ? "weak"
          : "none";

  const q = `Is the ${isPositive ? "increase" : "decrease"} in "${metricCol}" concentrated within a specific "${dimensionCol}" segment?`;
  const answer =
    `Yes — "${top.value}" accounts for ${top.contribution.toFixed(1)}% of the deviation ` +
    `(mean ${top.delta > 0 ? "+" : ""}${top.delta.toFixed(2)} vs baseline). ` +
    `Second largest: "${secondBest.value}" at ${secondBest.contribution.toFixed(1)}%.`;

  return {
    question: q,
    targetColumn: dimensionCol,
    analysisType: "segment_comparison",
    dataAnswer: answer,
    evidenceValue: top.contribution,
    supportsMainFinding: top.contribution > 10,
    evidenceStrength,
    confidence:
      evidenceStrength === "strong"
        ? 0.8
        : evidenceStrength === "moderate"
          ? 0.65
          : 0.4,
  };
}

function askCorrelationQuestion(
  metricCol: string,
  otherCol: string,
  rows: Record<string, unknown>[],
  cache?: ColumnCache,
): InvestigativeQuestion | null {
  const r = computeCorrelationCached(rows, cache, metricCol, otherCol);
  if (r === null) return null;

  const absR = Math.abs(r);
  const evidenceStrength: InvestigativeQuestion["evidenceStrength"] =
    absR > 0.7
      ? "strong"
      : absR > 0.4
        ? "moderate"
        : absR > 0.2
          ? "weak"
          : "none";

  const direction =
    r > 0.1 ? "positively" : r < -0.1 ? "negatively" : "not meaningfully";
  const answer =
    absR > 0.2
      ? `"${otherCol}" is ${direction} correlated with "${metricCol}" (r = ${r.toFixed(3)}). ` +
        `${absR > 0.5 ? `This is a ${absR > 0.7 ? "strong" : "moderate"} relationship that explains part of the observed pattern.` : "The relationship is weak."}`
      : `"${otherCol}" shows negligible correlation with "${metricCol}" (r = ${r.toFixed(3)}) — unlikely to be a driver.`;

  return {
    question: `Does "${otherCol}" co-vary with "${metricCol}" in a way that explains the observed pattern?`,
    targetColumn: otherCol,
    analysisType: "correlation",
    dataAnswer: answer,
    evidenceValue: r,
    supportsMainFinding: absR > 0.3 && r > 0,
    evidenceStrength,
    confidence:
      evidenceStrength === "strong"
        ? 0.85
        : evidenceStrength === "moderate"
          ? 0.65
          : 0.35,
  };
}

function askSeasonalityQuestion(
  ts: TimeSeriesAnalysis,
  metricCol: string,
): InvestigativeQuestion {
  const supportsMainFinding =
    ts.seasonalityDetected && ts.highSeasonPeriods.length > 0;
  const answer = ts.seasonalityDetected
    ? `Yes — a seasonal pattern is detected in "${metricCol}". Periods ${ts.highSeasonPeriods.join(", ")} ` +
      `consistently exceed the series mean by >30%. The peak in "${ts.peakPeriod}" aligns with these high-season periods.`
    : `No repeating seasonal pattern detected in "${metricCol}" (dataset spans ${ts.granularity} granularity). ` +
      `The observed anomaly is more likely event-driven than seasonal.`;

  return {
    question: `Is the anomaly in "${metricCol}" part of a repeating seasonal pattern or a one-time event?`,
    targetColumn: metricCol,
    analysisType: "temporal_pattern",
    dataAnswer: answer,
    evidenceValue: ts.seasonalityDetected ? 1 : 0,
    supportsMainFinding,
    evidenceStrength: ts.seasonalityDetected ? "moderate" : "none",
    confidence: ts.seasonalityDetected ? 0.7 : 0.6,
  };
}

function askTrendQuestion(
  ts: TimeSeriesAnalysis,
  metricCol: string,
): InvestigativeQuestion {
  const isStructural =
    ts.overallTrend === "growing" || ts.overallTrend === "declining";
  const answer = isStructural
    ? `"${metricCol}" shows a sustained ${ts.overallTrend} trend (${ts.totalGrowthPct.toFixed(1)}% total). ` +
      `The anomaly at "${ts.peakPeriod}" is the extreme of a structural trend, not a one-time spike.`
    : ts.overallTrend === "volatile"
      ? `"${metricCol}" is highly volatile — the anomaly may be one of several irregular spikes rather than a trend-driven peak.`
      : `"${metricCol}" is largely flat. The anomaly at "${ts.peakPeriod}" stands out as an event-driven spike against a stable baseline.`;

  return {
    question: `Is the anomaly the extreme of a sustained trend or an isolated event-driven spike?`,
    targetColumn: metricCol,
    analysisType: "temporal_pattern",
    dataAnswer: answer,
    evidenceValue: ts.totalGrowthPct,
    supportsMainFinding: isStructural,
    evidenceStrength: isStructural ? "strong" : "moderate",
    confidence: 0.75,
  };
}

function askAnomalyFrequencyQuestion(
  ts: TimeSeriesAnalysis,
  metricCol: string,
): InvestigativeQuestion {
  const anomalyPeriods = ts.periods
    .filter((p) => p.isAnomaly)
    .map((p) => p.period);
  const isPersistent = anomalyPeriods.length > 1;

  const answer = isPersistent
    ? `Multiple anomaly periods detected: ${anomalyPeriods.join(", ")}. ` +
      `Recurring anomalies suggest a systemic pattern (seasonality, recurring campaign, or data issue) rather than a unique event.`
    : `Only one anomaly period detected ("${anomalyPeriods[0]}"): this appears to be a unique event rather than a recurring pattern.`;

  return {
    question: `Is this anomaly a unique event or does it recur across multiple periods?`,
    targetColumn: metricCol,
    analysisType: "temporal_pattern",
    dataAnswer: answer,
    evidenceValue: anomalyPeriods.length,
    supportsMainFinding: true,
    evidenceStrength: isPersistent ? "moderate" : "strong",
    confidence: 0.7,
  };
}

function askDistributionShiftQuestion(
  metricCol: string,
  anomalyValue: number,
  rows: Record<string, unknown>[],
  cache?: ColumnCache,
): InvestigativeQuestion | null {
  const shift = computeDistributionShiftCached(
    rows,
    cache,
    metricCol,
    anomalyValue,
  );
  if (!shift) return null;

  const { zScore, percentile } = shift;

  const extremity =
    Math.abs(zScore) > 3
      ? "an extreme outlier (>3σ)"
      : Math.abs(zScore) > 2
        ? "a significant outlier (2–3σ)"
        : Math.abs(zScore) > 1
          ? "above the normal range (1–2σ)"
          : "within the normal distribution";

  const answer =
    `The observed value (${anomalyValue.toFixed(2)}) is ${extremity} ` +
    `with z-score ${zScore.toFixed(2)}. It sits at the ${percentile.toFixed(0)}th percentile of all observed values.`;

  return {
    question: `How extreme is the observed value relative to the overall distribution of "${metricCol}"?`,
    targetColumn: metricCol,
    analysisType: "distribution_shift",
    dataAnswer: answer,
    evidenceValue: zScore,
    supportsMainFinding: Math.abs(zScore) > 1.5,
    evidenceStrength:
      Math.abs(zScore) > 3
        ? "strong"
        : Math.abs(zScore) > 2
          ? "moderate"
          : Math.abs(zScore) > 1
            ? "weak"
            : "none",
    confidence: 0.85,
  };
}
