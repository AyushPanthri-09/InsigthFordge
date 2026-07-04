/**
 * Time-Series Engine
 * ------------------
 * Intelligent time-series analysis for any dataset with a date column.
 *
 * Capabilities:
 *  1. Period bucketing at correct granularity (day/week/month/quarter/year)
 *  2. Growth rate computation per period
 *  3. Moving Average smoothing (3-period and 7-period)
 *  4. Anomaly detection per period using z-scores
 *  5. Seasonality detection (repeating high/low patterns)
 *  6. Growth / Decline / Volatile period tagging
 *  7. Lightweight forecasting:
 *       - Simple Moving Average (SMA)
 *       - Exponential Smoothing (ETS/SES)
 *       - Holt's Linear Trend (double exponential smoothing)
 *  8. Plain-English narrative generation
 *
 * Design:
 *  - Pure functions, no side effects
 *  - All results carry explicit confidence scores and assumptions
 *  - Works with any numeric measure × date column pair
 */

import * as ss from "simple-statistics";
import type { ForecastResult, TimeSeriesAnalysis, TimeSeriesPeriod } from "../types";

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Runs the full time-series analysis for a measure × date column pair.
 *
 * @param rows         - Dataset rows
 * @param dateCol      - Name of the primary date column
 * @param measureCol   - Name of the measure column to analyse
 * @param granularity  - Detected granularity (from TimeIntelligence)
 * @param domain       - Business domain (for narrative generation)
 * @param parsedDates  - Optional pre-parsed date array (avoids re-parsing per call)
 */
export function analyseTimeSeries(
  rows: Record<string, unknown>[],
  dateCol: string,
  measureCol: string,
  granularity: string,
  domain = "generic",
  parsedDates?: (Date | null)[],
): TimeSeriesAnalysis | null {
  // Step 1: Bucket values by period
  const buckets = buildPeriodBuckets(rows, dateCol, measureCol, granularity, parsedDates);
  if (buckets.length < 4) return null; // need at least 4 periods

  const values = buckets.map((b) => b.value);
  const mean = ss.mean(values);
  const stdev = values.length > 1 ? ss.standardDeviation(values) : 0;

  // Step 2: Compute per-period metrics
  const movingAvg3 = computeMovingAverage(values, 3);
  const periods: TimeSeriesPeriod[] = buckets.map((b, i) => {
    const prev = i > 0 ? buckets[i - 1].value : null;
    const growthRate =
      prev !== null && Math.abs(prev) > 1e-9
        ? ((b.value - prev) / Math.abs(prev)) * 100
        : undefined;
    const zScore = stdev > 0 ? (b.value - mean) / stdev : 0;
    const isAnomaly = Math.abs(zScore) > 2.0;
    return {
      period: b.period,
      value: b.value,
      growthRate,
      movingAverage: movingAvg3[i],
      isAnomaly,
      zScore,
    };
  });

  // Step 3: Overall trend classification
  const overallTrend = classifyTrend(values);
  const totalGrowthPct =
    Math.abs(values[0]) > 1e-9
      ? ((values[values.length - 1] - values[0]) / Math.abs(values[0])) * 100
      : 0;

  // Step 4: Peak and trough
  const maxIdx = values.indexOf(Math.max(...values));
  const minIdx = values.indexOf(Math.min(...values));
  const peakPeriod = buckets[maxIdx]?.period ?? "";
  const troughPeriod = buckets[minIdx]?.period ?? "";

  // Step 5: Seasonality detection
  const { seasonalityDetected, highSeasonPeriods } = detectSeasonality(buckets);

  // Step 6: Forecast (only if we have ≥6 periods)
  let forecast: ForecastResult | undefined;
  if (values.length >= 6) {
    forecast = buildForecast(values, buckets, granularity);
  }

  // Step 7: Build narrative
  const narrative = buildNarrative(
    measureCol,
    overallTrend,
    totalGrowthPct,
    peakPeriod,
    troughPeriod,
    seasonalityDetected,
    highSeasonPeriods,
    domain,
  );

  return {
    measureColumn: measureCol,
    dateColumn: dateCol,
    granularity,
    periods,
    overallTrend,
    totalGrowthPct,
    peakPeriod,
    troughPeriod,
    seasonalityDetected,
    highSeasonPeriods,
    forecast,
    narrative,
  };
}

// ---------------------------------------------------------------------------
// Period bucketing
// ---------------------------------------------------------------------------

interface PeriodBucket {
  period: string;
  value: number;
  /** Numeric month or quarter index for seasonality detection. */
  periodIndex: number;
}

function buildPeriodBuckets(
  rows: Record<string, unknown>[],
  dateCol: string,
  measureCol: string,
  granularity: string,
  parsedDates?: (Date | null)[],
): PeriodBucket[] {
  const raw = new Map<string, { sum: number; idx: number }>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const d = parsedDates ? parsedDates[i] : parseDate(r[dateCol]);
    if (!d) continue;
    const val = Number(r[measureCol]);
    if (!Number.isFinite(val)) continue;
    const { key, index } = formatBucket(d, granularity);
    const existing = raw.get(key);
    if (existing) {
      existing.sum += val;
    } else {
      raw.set(key, { sum: val, idx: index });
    }
  }

  return Array.from(raw.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { sum, idx }]) => ({
      period,
      value: sum,
      periodIndex: idx,
    }));
}

function formatBucket(d: Date, granularity: string): { key: string; index: number } {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  switch (granularity) {
    case "year":
      return { key: `${y}`, index: y };
    case "quarter": {
      const q = Math.ceil(m / 3);
      return { key: `${y}-Q${q}`, index: q };
    }
    case "week": {
      const w = getISOWeek(d);
      return { key: `${y}-W${String(w).padStart(2, "0")}`, index: w };
    }
    case "day":
      return {
        key: `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        index: d.getDate(),
      };
    default: // month
      return { key: `${y}-${String(m).padStart(2, "0")}`, index: m };
  }
}

// ---------------------------------------------------------------------------
// Trend classification
// ---------------------------------------------------------------------------

function classifyTrend(values: number[]): TimeSeriesAnalysis["overallTrend"] {
  if (values.length < 3) return "flat";

  // Fit a linear trend to detect direction
  const n = values.length;
  const points: [number, number][] = new Array(n);
  for (let i = 0; i < n; i++) {
    points[i] = [i, values[i]];
  }
  let slope = 0;
  try {
    const lr = ss.linearRegression(points);
    slope = lr.m;
  } catch {
    slope = 0;
  }

  // Coefficient of variation to detect volatility
  const mean = ss.mean(values);
  const stdev = values.length > 1 ? ss.standardDeviation(values) : 0;
  const cv = Math.abs(mean) > 1e-9 ? stdev / Math.abs(mean) : 0;

  if (cv > 0.5) return "volatile";
  if (slope > mean * 0.02) return "growing"; // slope > 2% of mean per period
  if (slope < -mean * 0.02) return "declining";
  return "flat";
}

// ---------------------------------------------------------------------------
// Moving average
// ---------------------------------------------------------------------------

function computeMovingAverage(values: number[], window: number): (number | undefined)[] {
  const prefixSums: number[] = [0];
  for (const value of values) {
    prefixSums.push(prefixSums[prefixSums.length - 1] + value);
  }

  return values.map((_, i) => {
    const half = Math.floor(window / 2);
    const start = Math.max(0, i - half);
    const end = Math.min(values.length - 1, i + half);
    const count = end - start + 1;
    if (count < 2) return undefined;
    const sum = prefixSums[end + 1] - prefixSums[start];
    return sum / count;
  });
}

// ---------------------------------------------------------------------------
// Seasonality detection
// ---------------------------------------------------------------------------

function detectSeasonality(buckets: PeriodBucket[]): {
  seasonalityDetected: boolean;
  highSeasonPeriods: number[];
} {
  if (buckets.length < 8) {
    return { seasonalityDetected: false, highSeasonPeriods: [] };
  }

  const mean = ss.mean(buckets.map((b) => b.value));

  // Group by period index and average within each group
  const byIndex = new Map<number, number[]>();
  for (const b of buckets) {
    if (!byIndex.has(b.periodIndex)) byIndex.set(b.periodIndex, []);
    byIndex.get(b.periodIndex)!.push(b.value);
  }

  const indexAverages = Array.from(byIndex.entries()).map(([idx, vals]) => ({
    index: idx,
    avg: ss.mean(vals),
  }));

  // Seasonal if at least one period is consistently > 130% of the mean
  const highSeasons = indexAverages.filter((ia) => ia.avg > mean * 1.3).map((ia) => ia.index);

  // Need ≥2 cycles of data and at least one consistent high period
  const hasCycles = buckets.length >= 12 || (buckets.length >= 8 && byIndex.size >= 4);
  const seasonalityDetected = hasCycles && highSeasons.length > 0;

  return {
    seasonalityDetected,
    highSeasonPeriods: highSeasons.sort((a, b) => a - b),
  };
}

// ---------------------------------------------------------------------------
// Forecasting
// ---------------------------------------------------------------------------

import { generateAdvancedForecast } from "./analytics/forecastingEngine";

/**
 * Automatically selects the best lightweight forecasting method based on
 * detected trend characteristics, then forecasts the next 3 periods.
 */
function buildForecast(
  values: number[],
  buckets: PeriodBucket[],
  granularity: string,
): ForecastResult {
  return generateAdvancedForecast(
    values,
    buckets.map((b) => b.period),
    3,
  );
}

/** Simple N-period Moving Average forecast. */
function movingAverageForecast(
  values: number[],
  buckets: PeriodBucket[],
  granularity: string,
): ForecastResult {
  const window = Math.min(6, Math.floor(values.length / 2));
  const recentMean = ss.mean(values.slice(-window));
  const stdev = values.length > 1 ? ss.standardDeviation(values) : recentMean * 0.1;

  const nextPeriods = buildNextPeriodLabels(buckets[buckets.length - 1].period, 3, granularity).map(
    (period) => ({
      period,
      predicted: recentMean,
      lower: recentMean - 1.96 * stdev,
      upper: recentMean + 1.96 * stdev,
    }),
  );

  return {
    method: "moving_average",
    nextPeriods,
    confidence: 0.55,
    assumptions: [
      `Based on the ${window}-period moving average of recent values.`,
      "Assumes the series will remain flat around its recent mean.",
    ],
    risks: [
      "Does not capture trend direction — if a trend exists, forecasts will lag.",
      "Sensitive to recent anomalies in the training window.",
    ],
  };
}

/** Single Exponential Smoothing forecast. */
function exponentialSmoothingForecast(
  values: number[],
  buckets: PeriodBucket[],
  granularity: string,
): ForecastResult {
  const alpha = 0.3; // smoothing factor
  let smoothed = values[0];
  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
  }
  const stdev = values.length > 1 ? ss.standardDeviation(values) : smoothed * 0.1;

  const nextPeriods = buildNextPeriodLabels(buckets[buckets.length - 1].period, 3, granularity).map(
    (period, i) => ({
      period,
      predicted: smoothed,
      lower: smoothed - 1.96 * stdev * Math.sqrt(i + 1),
      upper: smoothed + 1.96 * stdev * Math.sqrt(i + 1),
    }),
  );

  return {
    method: "exponential_smoothing",
    nextPeriods,
    confidence: 0.6,
    assumptions: [
      `Exponential smoothing with α=${alpha} — recent observations weighted more heavily.`,
      "Assumes the series has no significant trend going forward.",
    ],
    risks: [
      "If a structural shift has occurred recently, the model may not adapt quickly.",
      "Forecast intervals widen with horizon — uncertainty increases.",
    ],
  };
}

/** Holt's Linear Trend (double exponential smoothing) forecast. */
function holtTrendForecast(
  values: number[],
  buckets: PeriodBucket[],
  granularity: string,
): ForecastResult {
  const alpha = 0.4; // level smoothing
  const beta = 0.2; // trend smoothing

  let level = values[0];
  let trend = values.length > 1 ? values[1] - values[0] : 0;

  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const stdev = values.length > 1 ? ss.standardDeviation(values) : Math.abs(level) * 0.1;
  const nextPeriods = buildNextPeriodLabels(buckets[buckets.length - 1].period, 3, granularity).map(
    (period, i) => {
      const h = i + 1;
      const predicted = level + h * trend;
      return {
        period,
        predicted,
        lower: predicted - 1.96 * stdev * Math.sqrt(h),
        upper: predicted + 1.96 * stdev * Math.sqrt(h),
      };
    },
  );

  const trendDir = trend > 0 ? "upward" : "downward";
  return {
    method: "holt_trend",
    nextPeriods,
    confidence: 0.65,
    assumptions: [
      `Holt's Linear Trend model with α=${alpha}, β=${beta}.`,
      `Assumes the current ${trendDir} trend of ${trend.toFixed(2)} per period continues.`,
    ],
    risks: [
      "Assumes the historical trend is structural, not driven by a one-time event.",
      "Does not account for seasonality — seasonal datasets require Holt-Winters.",
      "Confidence intervals are approximate; actual variance may be higher.",
    ],
  };
}

// ---------------------------------------------------------------------------
// Narrative generation
// ---------------------------------------------------------------------------

function buildNarrative(
  measureCol: string,
  trend: TimeSeriesAnalysis["overallTrend"],
  totalGrowthPct: number,
  peakPeriod: string,
  troughPeriod: string,
  seasonalityDetected: boolean,
  highSeasonPeriods: number[],
  domain: string,
): string {
  const col = measureCol.replace(/[_-]+/g, " ");
  const trendMap = {
    growing: `grew by ${totalGrowthPct.toFixed(1)}% over the analysis period`,
    declining: `declined by ${Math.abs(totalGrowthPct).toFixed(1)}% over the analysis period`,
    flat: "remained relatively flat over the analysis period",
    volatile: "showed high volatility over the analysis period",
  };

  let narrative = `${col} ${trendMap[trend]}. Peak performance was recorded in ${peakPeriod}; the lowest point was ${troughPeriod}.`;

  if (seasonalityDetected && highSeasonPeriods.length > 0) {
    narrative += ` A seasonal pattern was detected, with consistently elevated values in periods ${highSeasonPeriods.join(", ")} — investigate whether these align with ${domain === "ecommerce" ? "holiday shopping events, flash sales, or promotional calendars" : domain === "retail" ? "seasonal merchandise cycles or promotional events" : "known business cycles or external events"}.`;
  }

  if (trend === "growing") {
    narrative +=
      " The sustained growth trend suggests structural demand or market expansion rather than a one-time event — verify whether this growth is broad-based or driven by a single segment.";
  } else if (trend === "declining") {
    narrative +=
      " The decline pattern warrants investigation — determine whether this is driven by reduced demand, competitive pressure, pricing changes, or data coverage gaps.";
  } else if (trend === "volatile") {
    narrative +=
      " High volatility suggests the series is driven by irregular events (promotions, bulk orders, seasonal spikes) rather than stable underlying demand. Smooth the series before forecasting.";
  }

  return narrative;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function parseDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/**
 * Generates the next N period labels after the last known period.
 * Handles month, quarter, year, week string formats.
 */
function buildNextPeriodLabels(lastPeriod: string, n: number, granularity: string): string[] {
  const labels: string[] = [];

  if (granularity === "month" || !granularity) {
    // Format: YYYY-MM
    const match = /^(\d{4})-(\d{2})$/.exec(lastPeriod);
    if (match) {
      let y = parseInt(match[1]);
      let m = parseInt(match[2]);
      for (let i = 0; i < n; i++) {
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
        labels.push(`${y}-${String(m).padStart(2, "0")}`);
      }
      return labels;
    }
  }

  if (granularity === "quarter") {
    // Format: YYYY-QN
    const match = /^(\d{4})-Q(\d)$/.exec(lastPeriod);
    if (match) {
      let y = parseInt(match[1]);
      let q = parseInt(match[2]);
      for (let i = 0; i < n; i++) {
        q++;
        if (q > 4) {
          q = 1;
          y++;
        }
        labels.push(`${y}-Q${q}`);
      }
      return labels;
    }
  }

  if (granularity === "year") {
    const y = parseInt(lastPeriod);
    for (let i = 1; i <= n; i++) labels.push(String(y + i));
    return labels;
  }

  // Fallback: just append +1, +2, +3
  for (let i = 1; i <= n; i++) labels.push(`${lastPeriod}+${i}`);
  return labels;
}
