/**
 * Autonomous Investigation Orchestrator
 * --------------------------------------
 * Phase 2.5: Wires all investigation sub-engines into a single pipeline.
 *
 * For each key finding detected in EDA, this orchestrator:
 *  1. Generates investigative questions (Investigation Engine)
 *  2. Generates competing hypotheses (Hypothesis Engine)
 *  3. Tests each hypothesis against question answers (Hypothesis Engine)
 *  4. Ranks surviving hypotheses by evidence strength
 *  5. Builds the driver importance matrix
 *  6. Synthesises the SCQA executive narrative (Executive Narrative Engine)
 *  7. Returns a complete InvestigationResult
 *
 * The pipeline runs entirely from dataset evidence — no AI calls.
 * Results are passed to the AI reasoning layer as pre-computed evidence,
 * not as questions for the AI to speculate on.
 *
 * Public API:
 *   runAutonomousInvestigation(...)  → InvestigationResult[]
 */

import * as ss from "simple-statistics";
import type {
  ColumnProfile,
  DriverImportance,
  ExtendedNumericStats,
  InvestigationResult,
  InvestigativeQuestion,
  TestedHypothesis,
  TimeSeriesAnalysis,
} from "../types";
import { generateInvestigativeQuestions } from "./investigation-engine";
import {
  generateHypotheses,
  evaluateHypothesis,
  rankHypotheses,
  buildDriverImportance,
} from "./hypothesis-engine";
import { buildExecutiveNarrative } from "./executive-narrative";
import { investigationConfidence } from "./shared-confidence";
import type { ColumnCache } from "./eda";

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Runs the full autonomous investigation pipeline for every key finding.
 *
 * Findings are selected from:
 *  1. Time-series anomaly periods (z > 2.0) from each time-series analysis
 *  2. The peak period of each time-series (always investigated)
 *  3. High-deviation EDA findings
 *
 * @param rows            - Full dataset rows
 * @param profiles        - Column profiles from the profiler
 * @param timeSeriesArr   - Time-series analyses from the Time-Series Engine
 * @param topFindings     - EDA top-findings strings (for narrative context)
 * @param domain          - Business domain
 * @param qualityScore    - Data quality score from the cleaner (0-100)
 * @param maxInvestigations - Maximum number of findings to investigate (default 3)
 * @param extendedStats   - Pre-computed extended statistics from the Statistical Engine.
 *                          When provided, baseline means and p90 values are read from
 *                          this map instead of re-scanning dataset rows.
 */
export function runAutonomousInvestigation(
  rows: Record<string, unknown>[],
  profiles: ColumnProfile[],
  timeSeriesArr: TimeSeriesAnalysis[],
  topFindings: string[],
  domain: string,
  qualityScore: number,
  maxInvestigations = 3,
  extendedStats?: Record<string, ExtendedNumericStats>,
  cache?: ColumnCache,
): InvestigationResult[] {
  const results: InvestigationResult[] = [];

  const findingPool = buildFindingPool(
    rows,
    profiles,
    timeSeriesArr,
    extendedStats,
  );

  for (const finding of findingPool.slice(0, maxInvestigations)) {
    const result = investigateFinding(
      finding,
      rows,
      profiles,
      timeSeriesArr,
      domain,
      qualityScore,
      cache,
    );
    if (result) results.push(result);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Finding pool builder
// ---------------------------------------------------------------------------

interface FindingCandidate {
  finding: string;
  targetMetric: string;
  observedValue: number;
  baselineValue: number;
  deviationPct: number;
  /** Associated time series (if finding is time-related). */
  timeSeries?: TimeSeriesAnalysis;
  /** Priority score for ordering. */
  priority: number;
}

function buildFindingPool(
  rows: Record<string, unknown>[],
  profiles: ColumnProfile[],
  timeSeriesArr: TimeSeriesAnalysis[],
  extendedStats?: Record<string, ExtendedNumericStats>,
): FindingCandidate[] {
  const pool: FindingCandidate[] = [];

  // 1. Time-series peak periods (highest priority — most business-relevant)
  for (const ts of timeSeriesArr) {
    // Use pre-computed mean from extendedStats when available to avoid re-scanning rows.
    // Fall back to a full row scan if the column is not in extendedStats.
    let baseline: number;
    if (extendedStats?.[ts.measureColumn]) {
      const ext = extendedStats[ts.measureColumn];
      if (ext.mean === 0) continue;
      baseline = ext.mean;
    } else {
      const metricValues = rows
        .map((r) => Number(r[ts.measureColumn]))
        .filter((n) => Number.isFinite(n));
      if (metricValues.length < 5) continue;
           baseline = ss.median(metricValues);
      if (baseline === 0) continue;
    }

    // Find the peak period's aggregated value
    const peakPeriodData = ts.periods.find((p) => p.period === ts.peakPeriod);
    if (!peakPeriodData) continue;

        let deviationPct =
      ((peakPeriodData.value - baseline) / Math.abs(baseline)) * 100;
    // Cap extreme deviations to prevent statistical hallucinations
    if (deviationPct > 1000) deviationPct = 1000;
    if (deviationPct < -1000) deviationPct = -1000;
    if (Math.abs(deviationPct) < 15) continue;

    pool.push({
      finding: `${ts.measureColumn} peaked at ${formatValue(peakPeriodData.value)} in ${ts.peakPeriod}, which is ${Math.abs(deviationPct).toFixed(1)}% ${deviationPct > 0 ? "above" : "below"} the baseline average.`,
      targetMetric: ts.measureColumn,
      observedValue: peakPeriodData.value,
      baselineValue: baseline,
      deviationPct,
      timeSeries: ts,
      priority: Math.abs(deviationPct) * (ts.overallTrend !== "flat" ? 1.5 : 1),
    });

    // Also investigate anomaly periods if different from peak
    for (const period of ts.periods
      .filter((p) => p.isAnomaly && p.period !== ts.peakPeriod)
      .slice(0, 1)) {
      const anomalyDeviation =
        ((period.value - baseline) / Math.abs(baseline)) * 100;
      if (Math.abs(anomalyDeviation) < 20) continue;
      pool.push({
        finding: `Statistical anomaly detected in ${ts.measureColumn} during ${period.period} (z-score: ${(period.zScore ?? 0).toFixed(2)}).`,
        targetMetric: ts.measureColumn,
        observedValue: period.value,
        baselineValue: baseline,
        deviationPct: anomalyDeviation,
        timeSeries: ts,
        priority: Math.abs(anomalyDeviation),
      });
    }
  }

  // 2. Cross-sectional findings — top metric value in dataset (no time series)
  if (timeSeriesArr.length === 0) {
    const measures = profiles.filter(
      (p) => p.inferredRole === "measure" && p.stats,
    );
    for (const m of measures.slice(0, 2)) {
      // Use pre-computed mean and p90 from extendedStats when available.
      // Fall back to a full row scan if the column is not in extendedStats.
      let baseline: number;
      let p90: number;
      if (extendedStats?.[m.name] && m.nonNullCount >= 10) {
        const ext = extendedStats[m.name];
        baseline = ext.mean;
        p90 = ext.percentiles["p90"] ?? ext.max;
      } else {
        const metricValues = rows
          .map((r) => Number(r[m.name]))
          .filter((n) => Number.isFinite(n));
        if (metricValues.length < 10) continue;
        baseline = ss.mean(metricValues);
        p90 = ss.quantile(metricValues, 0.9);
      }
      const deviationPct =
        baseline > 0 ? ((p90 - baseline) / baseline) * 100 : 0;

      if (deviationPct < 20) continue;

      pool.push({
        finding: `${m.name} shows a notable high-value tail — the 90th percentile (${formatValue(p90)}) is ${deviationPct.toFixed(1)}% above the mean.`,
        targetMetric: m.name,
        observedValue: p90,
        baselineValue: baseline,
        deviationPct,
        priority: deviationPct,
      });
    }
  }

  return pool.sort((a, b) => b.priority - a.priority);
}

// ---------------------------------------------------------------------------
// Single finding investigation
// ---------------------------------------------------------------------------

function investigateFinding(
  candidate: FindingCandidate,
  rows: Record<string, unknown>[],
  profiles: ColumnProfile[],
  timeSeriesArr: TimeSeriesAnalysis[],
  domain: string,
  qualityScore: number,
  cache?: ColumnCache,
): InvestigationResult | null {
  // Step 1: Generate and answer investigative questions
  const questions = generateInvestigativeQuestions(
    candidate.targetMetric,
    candidate.observedValue,
    candidate.baselineValue,
    profiles,
    rows,
    candidate.timeSeries,
    domain,
    cache,
  );

  if (questions.length === 0) return null;

  // Step 2: Generate competing hypotheses
  const hypothesisTemplates = generateHypotheses(
    candidate.targetMetric,
    candidate.deviationPct,
    profiles,
    domain,
    candidate.timeSeries,
  );

  // Step 3: Test each hypothesis against the answered questions
  const testedHypotheses = hypothesisTemplates.map((hyp) =>
    evaluateHypothesis(hyp, questions, candidate.deviationPct),
  );

  // Step 4: Rank surviving hypotheses
  rankHypotheses(testedHypotheses);

  const leadingHypotheses = testedHypotheses
    .filter((h) => h.verdict !== "rejected" && h.rank !== null)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  const rejectedHypotheses = testedHypotheses.filter(
    (h) => h.verdict === "rejected",
  );

  // Step 5: Build driver importance matrix
  const driverImportance = buildDriverImportance(questions, profiles);

  // Step 6: Compute investigation confidence
  const confidence = computeInvestigationConfidence(
    testedHypotheses,
    questions,
    rows.length,
    qualityScore,
    candidate.deviationPct,
  );

  // Step 7: Build investigation conclusion
  const conclusion = buildInvestigationConclusion(
    candidate.targetMetric,
    candidate.observedValue,
    candidate.baselineValue,
    candidate.deviationPct,
    leadingHypotheses,
    rejectedHypotheses,
    driverImportance,
  );

  // Step 8: Generate executive narrative
  const forecastForNarrative = candidate.timeSeries?.forecast;
  const executiveNarrative = buildExecutiveNarrative(
    candidate.targetMetric,
    candidate.observedValue,
    candidate.baselineValue,
    candidate.deviationPct,
    leadingHypotheses,
    rejectedHypotheses,
    driverImportance,
    forecastForNarrative,
    domain,
  );

  return {
    finding: candidate.finding,
    targetMetric: candidate.targetMetric,
    observedValue: candidate.observedValue,
    baselineValue: candidate.baselineValue,
    deviationPct: candidate.deviationPct,
    questions,
    hypotheses: testedHypotheses,
    driverImportance,
    leadingHypotheses,
    rejectedHypotheses,
    conclusion,
    confidence,
    executiveNarrative,
  };
}

// ---------------------------------------------------------------------------
// Conclusion builder
// ---------------------------------------------------------------------------

function buildInvestigationConclusion(
  metricCol: string,
  observedValue: number,
  baselineValue: number,
  deviationPct: number,
  leadingHypotheses: TestedHypothesis[],
  rejectedHypotheses: TestedHypothesis[],
  drivers: DriverImportance[],
): string {
  const metric = metricCol.replace(/[_-]+/g, " ");
  const isPositive = deviationPct > 0;
  const absPct = Math.abs(deviationPct).toFixed(1);
  const dir = isPositive ? "above" : "below";

  let conclusion = `${metric} at ${formatValue(observedValue)} is ${absPct}% ${dir} baseline (${formatValue(baselineValue)}). `;

  if (leadingHypotheses.length > 0) {
    const top = leadingHypotheses[0];
    conclusion +=
      `Investigation conclusion: ${top.statement} ` +
      `(verdict: ${top.verdict}, confidence: ${(top.confidence * 100).toFixed(0)}%). `;

    if (top.supportingEvidence.length > 0) {
      conclusion += `Evidence: ${top.supportingEvidence[0].description} `;
    }
  } else {
    conclusion += `No single hypothesis could be confirmed from the available dataset columns. `;
  }

  if (rejectedHypotheses.length > 0) {
    conclusion +=
      `Explicitly rejected explanations (${rejectedHypotheses.length}): ` +
      rejectedHypotheses
        .slice(0, 2)
        .map((h) => `"${h.statement.split(".")[0]}" — ${h.rationale}`)
        .join("; ") +
      ". ";
  }

  if (drivers.length > 0) {
    const top3 = drivers.slice(0, 3);
    conclusion += `Top drivers by contribution: ${top3.map((d) => `${d.label} (${d.contributionPct.toFixed(0)}%)`).join(", ")}.`;
  }

  return conclusion;
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

function computeInvestigationConfidence(
  hypotheses: TestedHypothesis[],
  questions: InvestigativeQuestion[],
  totalRows: number,
  qualityScore: number,
  deviationPct: number,
): number {
  const strongQ = questions.filter(
    (q) => q.evidenceStrength === "strong",
  ).length;
  const moderateQ = questions.filter(
    (q) => q.evidenceStrength === "moderate",
  ).length;
  const supportedCount = hypotheses.filter(
    (h) => h.verdict === "supported",
  ).length;
  const rejectedCount = hypotheses.filter(
    (h) => h.verdict === "rejected",
  ).length;

  return investigationConfidence(
    strongQ,
    moderateQ,
    supportedCount,
    rejectedCount,
    totalRows,
    qualityScore,
    deviationPct,
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatValue(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(2);
}
