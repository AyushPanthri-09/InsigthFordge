/**
 * Confidence Engine
 * -----------------
 * Computes transparent, multi-factor confidence scores for insights.
 *
 * Replaces the single opaque 0-1 confidence number with a structured
 * breakdown that explains WHY an insight received its score.
 *
 * Factors considered:
 *  1. Data completeness  — how many nulls exist in relevant columns?
 *  2. Sample size        — is there enough data for statistical reliability?
 *  3. Statistical significance — is the finding above random noise?
 *  4. Data quality       — what is the cleaning quality score?
 *  5. Evidence consistency — do multiple signals agree?
 */

import type { ColumnProfile, ConfidenceBreakdown } from "../types";
import { edaInsightConfidence } from "./shared-confidence";

// ---------------------------------------------------------------------------
// Main confidence computation
// ---------------------------------------------------------------------------

export interface ConfidenceInputs {
  /** Columns involved in this insight. */
  relatedColumns: string[];
  /** All column profiles (for null rate lookup). */
  profiles: ColumnProfile[];
  /** Number of rows used in the analysis. */
  sampleSize: number;
  /** p-value from statistical test (undefined if no test was run). */
  pValue?: number;
  /** Data quality score from the cleaner (0-100). */
  qualityScore: number;
  /** Number of independent evidence signals that agree with the finding. */
  agreingSignals: number;
  /** Total evidence signals examined. */
  totalSignals: number;
}

/**
 * Computes a multi-factor confidence breakdown for an insight.
 * Delegates to the shared confidence utility for a consistent score,
 * then wraps the result in the ConfidenceBreakdown structure expected
 * by the EDA report and AI prompt builder.
 */
export function computeConfidenceBreakdown(
  inputs: ConfidenceInputs,
): ConfidenceBreakdown {
  // ── Factor 1: Data Completeness ────────────────────────────────────────
  const relevantProfiles = inputs.profiles.filter((p) =>
    inputs.relatedColumns.includes(p.name),
  );
  const avgNullRate =
    relevantProfiles.length > 0
      ? relevantProfiles.reduce((sum, p) => {
          const total = p.nonNullCount + p.nullCount;
          return sum + (total > 0 ? p.nullCount / total : 0);
        }, 0) / relevantProfiles.length
      : 0;
  const dataCompleteness = Math.max(0, 1 - avgNullRate * 2);

  // ── Factor 2: Sample Size ──────────────────────────────────────────────
  const sampleSize = sigmoidSample(inputs.sampleSize);

  // ── Factor 3: Statistical Significance ────────────────────────────────
  let statisticalSignificance: number;
  if (inputs.pValue === undefined) {
    statisticalSignificance = inputs.sampleSize >= 100 ? 0.6 : 0.4;
  } else if (inputs.pValue < 0.01) {
    statisticalSignificance = 0.95;
  } else if (inputs.pValue < 0.05) {
    statisticalSignificance = 0.8;
  } else if (inputs.pValue < 0.1) {
    statisticalSignificance = 0.6;
  } else {
    statisticalSignificance = 0.3;
  }

  // ── Factor 4: Data Quality ─────────────────────────────────────────────
  const dataQuality = inputs.qualityScore / 100;

  // ── Factor 5: Evidence Consistency ────────────────────────────────────
  const evidenceConsistency =
    inputs.totalSignals > 0 ? inputs.agreingSignals / inputs.totalSignals : 0.5;

  // ── Composite score via shared confidence utility ──────────────────────
  const overall = edaInsightConfidence(
    dataCompleteness,
    sampleSize,
    statisticalSignificance,
    dataQuality,
    evidenceConsistency,
  );

  const explanation = buildExplanation(
    overall,
    dataCompleteness,
    sampleSize,
    statisticalSignificance,
    dataQuality,
    evidenceConsistency,
    inputs.sampleSize,
    avgNullRate,
  );

  return {
    overall,
    factors: {
      dataCompleteness,
      sampleSize,
      statisticalSignificance,
      dataQuality,
      evidenceConsistency,
    },
    explanation,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Maps sample size to a 0-1 reliability score using a sigmoid-like function.
 * n=10 → ~0.3, n=30 → ~0.55, n=100 → ~0.75, n=500 → ~0.9, n=1000+ → ~0.95
 */
function sigmoidSample(n: number): number {
  if (n >= 1000) return 0.95;
  if (n >= 500) return 0.9;
  if (n >= 100) return 0.75;
  if (n >= 30) return 0.55;
  if (n >= 10) return 0.35;
  return 0.2;
}

function buildExplanation(
  overall: number,
  completeness: number,
  sampleSizeScore: number,
  significance: number,
  quality: number,
  consistency: number,
  rawSampleSize: number,
  avgNullRate: number,
): string {
  const level =
    overall >= 0.85
      ? "High"
      : overall >= 0.65
        ? "Moderate"
        : overall >= 0.45
          ? "Low-moderate"
          : "Low";

  const weakFactors: string[] = [];
  if (completeness < 0.6)
    weakFactors.push(
      `data completeness is low (${(avgNullRate * 100).toFixed(0)}% null rate)`,
    );
  if (sampleSizeScore < 0.5)
    weakFactors.push(`sample size is small (${rawSampleSize} rows)`);
  if (significance < 0.5)
    weakFactors.push("statistical significance could not be confirmed");
  if (quality < 0.6)
    weakFactors.push("data quality issues were detected during cleaning");
  if (consistency < 0.5) weakFactors.push("evidence signals are inconsistent");

  let explanation = `${level} confidence (${(overall * 100).toFixed(0)}%). `;

  if (weakFactors.length === 0) {
    explanation +=
      "All confidence factors are strong — this finding is well-supported.";
  } else {
    explanation += `Limiting factors: ${weakFactors.join("; ")}. Treat this finding with proportional caution.`;
  }

  return explanation;
}
