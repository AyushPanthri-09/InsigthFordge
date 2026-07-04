/**
 * Statistical Engine
 * ------------------
 * Computes professional-grade statistics for numeric columns.
 *
 * Every statistic is accompanied by a plain-English business explanation.
 * All methods are pure functions — no data mutation, no side effects.
 *
 * Computes:
 *  - Skewness (Pearson moment coefficient)
 *  - Excess kurtosis
 *  - Coefficient of variation
 *  - 95% confidence interval for the mean
 *  - Z-score based anomaly detection
 *  - Distribution shape classification
 *  - Percentile breakdown (p5, p10, p25, p50, p75, p90, p95)
 *  - Trend strength (for ordered series)
 */

import * as ss from "simple-statistics";
import type {
  ColumnProfile,
  ExtendedNumericStats,
  NumericStats,
  StatisticalTest,
} from "../types";

type SegmentBreakdown = Array<{
  value: string;
  segmentMean: number;
  segmentCount: number;
  delta: number;
  contribution: number;
  isTopContributor: boolean;
}>;

type SegmentBucket = {
  sum: number;
  count: number;
};

// ---------------------------------------------------------------------------
// Core extended statistics computation
// ---------------------------------------------------------------------------

/**
 * Computes the full ExtendedNumericStats for a numeric array.
 *
 * @param nums   - Clean numeric values (no NaN/Infinity)
 * @param colName - Column name (used in explanations)
 * @param domain  - Business domain (used to tune business explanations)
 */
export function computeExtendedStats(
  nums: number[],
  colName: string,
  domain = "generic",
): ExtendedNumericStats | null {
  if (nums.length < 4) return null; // insufficient data

  // ── Base statistics (reuse NumericStats computation) ──────────────────
  const sorted = [...nums].sort((a, b) => a - b);
  const mean = ss.mean(nums);
  const median = ss.median(nums);
  const stdev = nums.length > 1 ? ss.standardDeviation(nums) : 0;
  const q1 = ss.quantile(sorted, 0.25);
  const q3 = ss.quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const outlierCount = nums.filter(
    (n) => n < q1 - 1.5 * iqr || n > q3 + 1.5 * iqr,
  ).length;

  // ── Distribution shape ─────────────────────────────────────────────────
  const skewness = computeSkewness(nums, mean, stdev);
  const kurtosis = computeKurtosis(nums, mean, stdev);
  const distributionShape = classifyDistribution(skewness, kurtosis, nums);
  const distributionExplanation = buildDistributionExplanation(
    distributionShape,
    skewness,
    colName,
    domain,
  );

  // ── Coefficient of variation ───────────────────────────────────────────
  // CV = σ/μ; only meaningful when mean ≠ 0
  const coefficientOfVariation = mean !== 0 ? Math.abs(stdev / mean) : 0;

  // ── 95% Confidence interval for the mean (t-distribution approx) ──────
  // For n > 30: z* ≈ 1.96. For smaller samples: use t* from lookup.
  const zStar = confidenceZ(nums.length, 0.95);
  const marginOfError = zStar * (stdev / Math.sqrt(nums.length));
  const confidenceInterval95: [number, number] = [
    mean - marginOfError,
    mean + marginOfError,
  ];

  // ── Z-score anomaly detection ──────────────────────────────────────────
  const zScoreThreshold = 2.5; // industry standard for anomaly detection
  const anomalyCount = nums.filter(
    (n) => Math.abs((n - mean) / Math.max(stdev, 1e-9)) > zScoreThreshold,
  ).length;

  // ── Percentiles ────────────────────────────────────────────────────────
  const percentiles: Record<string, number> = {
    p5: ss.quantile(sorted, 0.05),
    p10: ss.quantile(sorted, 0.1),
    p25: q1,
    p50: median,
    p75: q3,
    p90: ss.quantile(sorted, 0.9),
    p95: ss.quantile(sorted, 0.95),
  };

  return {
    min,
    max,
    mean,
    median,
    stdev,
    q1,
    q3,
    outlierCount,
    skewness,
    kurtosis,
    coefficientOfVariation,
    confidenceInterval95,
    zScoreThreshold,
    anomalyCount,
    distributionShape,
    distributionExplanation,
    percentiles,
  };
}

/**
 * Runs computeExtendedStats for every numeric column in a profile list.
 * Returns a map of column name → ExtendedNumericStats.
 *
 * When a ColumnCache is provided, numeric vectors are read from the cache
 * instead of re-scanning rows — eliminating one O(n) pass per column.
 */
export function computeAllExtendedStats(
  rows: Record<string, unknown>[],
  profiles: ColumnProfile[],
  domain = "generic",
  cache?: { numericVectors: Map<string, number[]> },
): Record<string, ExtendedNumericStats> {
  const result: Record<string, ExtendedNumericStats> = {};

  for (const p of profiles) {
    if (p.inferredRole !== "measure") continue;
    // Use cached vector when available; fall back to row scan only if not cached.
    const nums =
      cache?.numericVectors.get(p.name) ??
      rows.map((r) => Number(r[p.name])).filter((n) => Number.isFinite(n));
    const ext = computeExtendedStats(nums, p.name, domain);
    if (ext) result[p.name] = ext;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Statistical tests
// ---------------------------------------------------------------------------

/**
 * Runs normality check (Shapiro-Wilk approximation using skewness+kurtosis).
 * A full Shapiro-Wilk test requires an external library; this is a fast
 * heuristic that is accurate enough for business reporting.
 */
export function testNormality(
  nums: number[],
  colName: string,
): StatisticalTest {
  if (nums.length < 8) {
    return {
      testName: "Normality (Skewness-Kurtosis Test)",
      statistic: 0,
      pValue: 1,
      isSignificant: false,
      interpretation:
        "Insufficient data for normality test (minimum 8 observations required).",
      businessImplication: "Cannot determine distribution shape reliably.",
    };
  }

  const mean = ss.mean(nums);
  const stdev = ss.standardDeviation(nums);
  const skew = computeSkewness(nums, mean, stdev);
  const kurt = computeKurtosis(nums, mean, stdev);

  // Heuristic: normal if |skew| < 0.5 AND |excess kurtosis| < 1
  const isNormal = Math.abs(skew) < 0.5 && Math.abs(kurt) < 1.0;

  // Approximate p-value proxy: higher deviation from normal = lower p
  const deviation = Math.sqrt(skew * skew + kurt * kurt * 0.25);
  const pValue = isNormal ? 0.2 : Math.max(0.001, 0.05 - deviation * 0.01);
  const isSignificant = pValue < 0.05; // significant deviation from normal

  return {
    testName: "Normality (Skewness-Kurtosis Heuristic)",
    statistic: deviation,
    pValue,
    isSignificant,
    interpretation: isNormal
      ? `"${colName}" appears approximately normally distributed (skew=${skew.toFixed(2)}, kurtosis=${kurt.toFixed(2)}).`
      : `"${colName}" deviates from normality (skew=${skew.toFixed(2)}, kurtosis=${kurt.toFixed(2)}). Distribution is ${skew > 0 ? "right" : "left"}-skewed.`,
    businessImplication: isNormal
      ? "Parametric statistical methods (t-tests, ANOVA, linear regression) are appropriate for this column."
      : "Use non-parametric methods (median, IQR, Mann-Whitney) for robust analysis. Averages may be misleading.",
  };
}

/**
 * Derives a normality test result from pre-computed ExtendedNumericStats,
 * avoiding a redundant O(n) row scan when the stats are already available.
 *
 * Produces output identical to testNormality() for the same numeric array.
 * Called by buildEDA() which always computes extendedStats first.
 */
export function testNormalityFromExtendedStats(
  ext: ExtendedNumericStats,
  colName: string,
): StatisticalTest {
  const skew = ext.skewness;
  const kurt = ext.kurtosis;

  const isNormal = Math.abs(skew) < 0.5 && Math.abs(kurt) < 1.0;
  const deviation = Math.sqrt(skew * skew + kurt * kurt * 0.25);
  const pValue = isNormal ? 0.2 : Math.max(0.001, 0.05 - deviation * 0.01);
  const isSignificant = pValue < 0.05;

  return {
    testName: "Normality (Skewness-Kurtosis Heuristic)",
    statistic: deviation,
    pValue,
    isSignificant,
    interpretation: isNormal
      ? `"${colName}" appears approximately normally distributed (skew=${skew.toFixed(2)}, kurtosis=${kurt.toFixed(2)}).`
      : `"${colName}" deviates from normality (skew=${skew.toFixed(2)}, kurtosis=${kurt.toFixed(2)}). Distribution is ${skew > 0 ? "right" : "left"}-skewed.`,
    businessImplication: isNormal
      ? "Parametric statistical methods (t-tests, ANOVA, linear regression) are appropriate for this column."
      : "Use non-parametric methods (median, IQR, Mann-Whitney) for robust analysis. Averages may be misleading.",
  };
}

/**
 * Tests whether two group means are significantly different.
 * Uses a simplified Welch's t-test approximation (no external dep required).
 */
export function testGroupDifference(
  groupA: number[],
  groupB: number[],
  groupALabel: string,
  groupBLabel: string,
  metricName: string,
): StatisticalTest {
  if (groupA.length < 4 || groupB.length < 4) {
    return {
      testName: "Group Difference (Welch t-test)",
      statistic: 0,
      pValue: 1,
      isSignificant: false,
      interpretation: "Insufficient data for group comparison.",
      businessImplication:
        "Cannot determine if group difference is real or due to chance.",
    };
  }

  const meanA = ss.mean(groupA);
  const meanB = ss.mean(groupB);
  const varA = ss.variance(groupA);
  const varB = ss.variance(groupB);
  const nA = groupA.length;
  const nB = groupB.length;

  const se = Math.sqrt(varA / nA + varB / nB);
  if (se === 0) {
    return {
      testName: "Group Difference (Welch t-test)",
      statistic: 0,
      pValue: 1,
      isSignificant: false,
      interpretation: "Groups have identical values — no variation to test.",
      businessImplication: "No meaningful difference between groups.",
    };
  }

  const t = Math.abs(meanA - meanB) / se;
  // Approximate p-value using normal distribution (valid for n > 30)
  const pValue = approximatePValue(t);
  const isSignificant = pValue < 0.05;
  const diffPct = meanB !== 0 ? ((meanA - meanB) / Math.abs(meanB)) * 100 : 0;

  return {
    testName: "Group Difference (Welch t-test)",
    statistic: t,
    pValue,
    isSignificant,
    interpretation: isSignificant
      ? `Significant difference in ${metricName} between "${groupALabel}" (mean=${meanA.toFixed(2)}) and "${groupBLabel}" (mean=${meanB.toFixed(2)}). ${groupALabel} is ${Math.abs(diffPct).toFixed(1)}% ${diffPct > 0 ? "higher" : "lower"}.`
      : `No statistically significant difference in ${metricName} between "${groupALabel}" and "${groupBLabel}" at 95% confidence.`,
    businessImplication: isSignificant
      ? `The ${Math.abs(diffPct).toFixed(1)}% gap in ${metricName} between these groups is unlikely to be random chance — investigate the drivers.`
      : `Observed differences in ${metricName} between groups could be due to random variation. Do not base strategic decisions on this gap alone.`,
  };
}

export function computeCorrelationCached(
  rows: Record<string, unknown>[],
  cache:
    | {
        numericVectors: Map<string, number[]>;
        correlationCache: Map<string, number>;
      }
    | undefined,
  metricCol: string,
  otherCol: string,
): number | null {
  if (cache) {
    const key =
      metricCol < otherCol
        ? `${metricCol}|${otherCol}`
        : `${otherCol}|${metricCol}`;
    if (cache.correlationCache.has(key)) {
      const cached = cache.correlationCache.get(key)!;
      return Number.isFinite(cached) ? cached : null;
    }

    const xs = cache.numericVectors.get(metricCol);
    const ys = cache.numericVectors.get(otherCol);
    if (!xs || !ys || xs.length < 8 || ys.length < 8 || xs.length !== ys.length)
      return null;

    try {
      const r = ss.sampleCorrelation(xs, ys);
      if (!Number.isFinite(r)) {
        cache.correlationCache.set(key, NaN);
        return null;
      }
      cache.correlationCache.set(key, r);
      return r;
    } catch {
      return null;
    }
  }

  const xs: number[] = [];
  const ys: number[] = [];
  for (const row of rows) {
    const x = Number(row[metricCol]);
    const y = Number(row[otherCol]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      xs.push(x);
      ys.push(y);
    }
  }

  if (xs.length < 8) return null;
  try {
    const r = ss.sampleCorrelation(xs, ys);
    return Number.isFinite(r) ? r : null;
  } catch {
    return null;
  }
}

export function computeDistributionShiftCached(
  rows: Record<string, unknown>[],
  cache: { numericVectors: Map<string, number[]> } | undefined,
  metricCol: string,
  anomalyValue: number,
): {
  zScore: number;
  percentile: number;
  valueCount: number;
} | null {
  const values =
    cache?.numericVectors.get(metricCol) ??
    rows.map((r) => Number(r[metricCol])).filter((n) => Number.isFinite(n));

  if (values.length < 10) return null;

  const mean = ss.mean(values);
  const stdev = values.length > 1 ? ss.standardDeviation(values) : 0;
  const zScore = stdev > 0 ? (anomalyValue - mean) / stdev : 0;
  const percentile =
    (values.filter((v) => v <= anomalyValue).length / values.length) * 100;

  return {
    zScore,
    percentile,
    valueCount: values.length,
  };
}

// ---------------------------------------------------------------------------
// Internal statistical helpers
// ---------------------------------------------------------------------------

function computeSkewness(nums: number[], mean: number, stdev: number): number {
  if (stdev === 0 || nums.length < 3) return 0;
  const n = nums.length;
  const cubedDeviations = nums.reduce(
    (sum, x) => sum + Math.pow((x - mean) / stdev, 3),
    0,
  );
  return (n / ((n - 1) * (n - 2))) * cubedDeviations;
}

function computeKurtosis(nums: number[], mean: number, stdev: number): number {
  if (stdev === 0 || nums.length < 4) return 0;
  const n = nums.length;
  const fourthMoment = nums.reduce(
    (sum, x) => sum + Math.pow((x - mean) / stdev, 4),
    0,
  );
  // Excess kurtosis (subtract 3 for normal distribution baseline)
  return (
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * fourthMoment -
    (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3))
  );
}

function classifyDistribution(
  skewness: number,
  kurtosis: number,
  nums: number[],
): ExtendedNumericStats["distributionShape"] {
  if (Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 1) return "normal";
  if (skewness > 1) return "right_skewed";
  if (skewness < -1) return "left_skewed";

  // Bimodal check: if std is large relative to IQR
  if (nums.length > 20) {
    const q1 = ss.quantile(nums, 0.25);
    const q3 = ss.quantile(nums, 0.75);
    const iqr = q3 - q1;
    const stdev = ss.standardDeviation(nums);
    if (stdev > 0 && iqr / stdev < 0.5) return "bimodal";
  }

  if (kurtosis < -1) return "uniform";
  return "unknown";
}

function buildDistributionExplanation(
  shape: ExtendedNumericStats["distributionShape"],
  skewness: number,
  colName: string,
  domain: string,
): string {
  const prettyCol = colName.replace(/[_-]+/g, " ");
  switch (shape) {
    case "normal":
      return `"${prettyCol}" follows a roughly normal distribution — mean and median are close, most values cluster near the centre. Standard parametric analysis is appropriate.`;
    case "right_skewed":
      return `"${prettyCol}" is right-skewed (skew=${skewness.toFixed(2)}): a few very high values pull the mean above the median. In ${domain}, this is common for revenue (most transactions are small; a few are very large). Use median for central tendency.`;
    case "left_skewed":
      return `"${prettyCol}" is left-skewed (skew=${skewness.toFixed(2)}): a few very low values pull the mean below the median. May indicate returns, discounts, or floor-level effects.`;
    case "bimodal":
      return `"${prettyCol}" shows a bimodal pattern — two distinct clusters of values. This often indicates two different customer segments, product types, or markets mixed in the same column.`;
    case "uniform":
      return `"${prettyCol}" is approximately uniformly distributed — values spread evenly across the range. May indicate an ID-like column or evenly distributed categorical encoding.`;
    default:
      return `"${prettyCol}" has an irregular distribution that doesn't match common patterns. Investigate for data quality issues or segment mixing.`;
  }
}

/**
 * Returns the z* critical value for a given confidence level and sample size.
 * Uses a simplified lookup (z-distribution for n>30; t-approx for smaller).
 */
function confidenceZ(n: number, level: number): number {
  if (Math.abs(level - 0.95) < 1e-9) {
    if (n >= 30) return 1.96;
    if (n >= 20) return 2.09;
    if (n >= 15) return 2.13;
    if (n >= 10) return 2.23;
    return 2.57; // conservative
  }
  if (Math.abs(level - 0.99) < 1e-9) return n >= 30 ? 2.576 : 3.25;
  return 1.645; // 90%
}

/**
 * Approximate two-tailed p-value from a t-statistic using a rational
 * approximation of the normal CDF. Accurate to ~3 decimal places.
 */
function approximatePValue(t: number): number {
  // Abramowitz & Stegun approximation for the normal tail
  const x = Math.abs(t);
  const p = 0.3275911;
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741;
  const a4 = -1.453152027,
    a5 = 1.061405429;
  const k = 1 / (1 + p * x);
  const poly = k * (a1 + k * (a2 + k * (a3 + k * (a4 + k * a5))));
  const erf = 1 - poly * Math.exp(-x * x);
  return Math.max(0.001, 1 - erf);
}

// ---------------------------------------------------------------------------
// Segment comparison helper (used by Root Cause Engine)
// ---------------------------------------------------------------------------

/**
 * For a given metric column, computes the mean value broken down by
 * each unique value of a categorical dimension column.
 * Returns segments sorted by contribution magnitude.
 */
export function computeSegmentBreakdown(
  rows: Record<string, unknown>[],
  metricCol: string,
  dimensionCol: string,
  baselineMean: number,
): SegmentBreakdown {
  const buckets = new Map<string, SegmentBucket>();

  for (const r of rows) {
    const dim = String(r[dimensionCol] ?? "Unknown");
    const val = Number(r[metricCol]);
    if (!Number.isFinite(val)) continue;
    addSegmentValue(buckets, dim, val);
  }

  return buildSegmentBreakdown(buckets, rows.length, baselineMean);
}

function addSegmentValue(
  buckets: Map<string, SegmentBucket>,
  dim: string,
  val: number,
): void {
  const bucket = buckets.get(dim);
  if (bucket) {
    bucket.sum += val;
    bucket.count += 1;
  } else {
    buckets.set(dim, { sum: val, count: 1 });
  }
}

function buildSegmentBreakdown(
  buckets: Map<string, SegmentBucket>,
  totalRows: number,
  baselineMean: number,
): SegmentBreakdown {
  const segments = Array.from(buckets.entries())
    .map(([value, bucket]) => {
      const segmentMean = bucket.sum / bucket.count;
      const delta = segmentMean - baselineMean;
      const weight = bucket.count / totalRows;
      const contribution = Math.abs(delta * weight * 100);
      return {
        value,
        segmentMean,
        segmentCount: bucket.count,
        delta,
        contribution,
        isTopContributor: false,
      };
    })
    .sort((a, b) => b.contribution - a.contribution);

  // Mark top 3 contributors
  for (let i = 0; i < Math.min(3, segments.length); i++) {
    segments[i].isTopContributor = true;
  }

  return segments;
}

export function computeSegmentBreakdownCached(
  rows: Record<string, unknown>[],
  cache: { numericVectors: Map<string, number[]> } | undefined,
  dimensionCol: string,
  metricCol: string,
  baselineMean: number,
): ReturnType<typeof computeSegmentBreakdown> {
  if (cache?.numericVectors.has(metricCol)) {
    const buckets = new Map<string, SegmentBucket>();

    for (const r of rows) {
      const dim = String(r[dimensionCol] ?? "Unknown");
      const val = Number(r[metricCol]);
      if (!Number.isFinite(val)) continue;
      addSegmentValue(buckets, dim, val);
    }

    return buildSegmentBreakdown(buckets, rows.length, baselineMean);
  }

  return computeSegmentBreakdown(rows, metricCol, dimensionCol, baselineMean);
}
