/**
 * Shared Confidence Utility
 * -------------------------
 * Single source of truth for all confidence scoring across the analytics
 * pipeline. Replaces the five independent additive/harmonic systems that
 * previously existed in column-intelligence, confidence-engine,
 * root-cause-engine, autonomous-investigator, and business-context.
 *
 * Formula: weighted linear combination, clamped to [0, 1].
 *
 *   confidence =
 *     0.25 * patternConsistency   — how well name/type signals agree
 *     0.20 * headerAlignment      — how clearly the column header maps to a known concept
 *     0.25 * statisticalStrength  — sample size, significance, or deviation magnitude
 *     0.15 * uniquenessRatio      — data density / non-null completeness
 *     0.15 * signalQuality        — evidence consistency or data quality score
 *
 * Every caller maps its own domain-specific inputs onto these five factors
 * before calling computeConfidence(). This keeps the formula stable while
 * allowing each engine to express what it actually knows.
 */

export interface ConfidenceFactors {
  /** 0-1: how consistently name/type/value patterns agree on the classification. */
  patternConsistency: number;
  /** 0-1: how directly the column header (or finding label) maps to a known concept. */
  headerAlignment: number;
  /** 0-1: statistical reliability — sample size, p-value proxy, or deviation magnitude. */
  statisticalStrength: number;
  /** 0-1: data completeness — non-null ratio or unique-value density. */
  uniquenessRatio: number;
  /** 0-1: evidence consistency — agreeing signals / total signals, or quality score. */
  signalQuality: number;
}

/**
 * Computes a unified confidence score from five normalised factors.
 * All inputs must be in [0, 1]. Output is clamped to [0, 1].
 */
export function computeConfidence(factors: ConfidenceFactors): number {
  const score =
    0.25 * factors.patternConsistency +
    0.20 * factors.headerAlignment +
    0.25 * factors.statisticalStrength +
    0.15 * factors.uniquenessRatio +
    0.15 * factors.signalQuality;

  return Math.max(0, Math.min(1, score));
}

// ---------------------------------------------------------------------------
// Domain-specific adapter helpers
// These translate each engine's native inputs into ConfidenceFactors so that
// call-sites remain readable without duplicating the mapping logic.
// ---------------------------------------------------------------------------

/**
 * Adapter for Column Intelligence Engine.
 *
 * @param hasDirectNameMatch  - column name matched a CATEGORY_SIGNALS pattern
 * @param typeIsUnambiguous   - inferredType is not "unknown" or "categorical"
 * @param categoryIsKnown     - category is not "unknown"
 * @param dataDensity         - nonNullCount / totalRows (0-1)
 * @param isHighCardCategorical - high-cardinality categorical (ambiguity penalty)
 */
export function columnIntelligenceConfidence(
  hasDirectNameMatch: boolean,
  typeIsUnambiguous: boolean,
  categoryIsKnown: boolean,
  dataDensity: number,
  isHighCardCategorical: boolean,
): number {
  return computeConfidence({
    patternConsistency: typeIsUnambiguous ? 0.8 : 0.4,
    headerAlignment: hasDirectNameMatch ? 1.0 : categoryIsKnown ? 0.5 : 0.2,
    statisticalStrength: isHighCardCategorical ? 0.3 : 0.7,
    uniquenessRatio: Math.min(1, dataDensity),
    signalQuality: categoryIsKnown ? 0.8 : 0.3,
  });
}

/**
 * Adapter for Confidence Engine (EDA insight confidence).
 *
 * @param dataCompleteness    - 1 - weighted null rate (0-1)
 * @param sampleSizeScore     - sigmoid-mapped sample size (0-1)
 * @param statisticalSig      - p-value mapped to 0-1 significance score
 * @param dataQuality         - cleaning quality score / 100
 * @param evidenceConsistency - agreeing signals / total signals
 */
export function edaInsightConfidence(
  dataCompleteness: number,
  sampleSizeScore: number,
  statisticalSig: number,
  dataQuality: number,
  evidenceConsistency: number,
): number {
  return computeConfidence({
    patternConsistency: evidenceConsistency,
    headerAlignment: dataCompleteness,
    statisticalStrength: statisticalSig,
    uniquenessRatio: sampleSizeScore,
    signalQuality: dataQuality,
  });
}

/**
 * Adapter for Root Cause Analysis Engine.
 *
 * @param deviationPct      - absolute deviation percentage (used as signal strength)
 * @param dimensionCount    - number of consistent dimensions found
 * @param totalRows         - dataset row count
 * @param topContribution   - top segment contribution percentage (0-100)
 */
export function rcaConfidence(
  deviationPct: number,
  dimensionCount: number,
  totalRows: number,
  topContribution: number,
): number {
  const deviationStrength = Math.min(1, deviationPct / 100);
  const dimensionAgreement = Math.min(1, dimensionCount / 3);
  const sampleStrength = totalRows >= 1000 ? 1.0 : totalRows >= 100 ? 0.7 : 0.4;
  const contributionStrength = Math.min(1, topContribution / 50);

  return computeConfidence({
    patternConsistency: dimensionAgreement,
    headerAlignment: deviationStrength,
    statisticalStrength: sampleStrength,
    uniquenessRatio: contributionStrength,
    signalQuality: deviationStrength,
  });
}

/**
 * Adapter for Autonomous Investigation Engine.
 *
 * @param strongQuestions   - count of questions with "strong" evidence
 * @param moderateQuestions - count of questions with "moderate" evidence
 * @param supportedCount    - hypotheses with verdict "supported"
 * @param rejectedCount     - hypotheses with verdict "rejected"
 * @param totalRows         - dataset row count
 * @param qualityScore      - data quality score (0-100)
 * @param deviationPct      - absolute deviation percentage
 */
export function investigationConfidence(
  strongQuestions: number,
  moderateQuestions: number,
  supportedCount: number,
  rejectedCount: number,
  totalRows: number,
  qualityScore: number,
  deviationPct: number,
): number {
  const evidenceStrength = Math.min(1, strongQuestions * 0.25 + moderateQuestions * 0.1);
  const hypothesisClarity =
    supportedCount >= 1 && rejectedCount >= 1 ? 1.0
    : supportedCount >= 1 ? 0.7
    : 0.3;
  const sampleStrength = totalRows >= 1000 ? 1.0 : totalRows >= 100 ? 0.6 : 0.3;
  const deviationStrength = Math.min(1, Math.abs(deviationPct) / 75);

  return computeConfidence({
    patternConsistency: evidenceStrength,
    headerAlignment: hypothesisClarity,
    statisticalStrength: sampleStrength,
    uniquenessRatio: deviationStrength,
    signalQuality: qualityScore / 100,
  });
}
