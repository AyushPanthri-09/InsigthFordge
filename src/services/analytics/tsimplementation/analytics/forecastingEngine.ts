import * as ss from "simple-statistics";
import type { ForecastResult } from "../../types";

export interface ExtendedForecastResult extends ForecastResult {
  selectedMethod:
    "moving_average" | "weighted_moving_average" | "exponential_smoothing" | "linear_regression";
  explanation: string;
  mape: number;
}

/**
 * Automatically forecasts the next N periods using the optimal method among MA, WMA, ES, and LR.
 */
export function generateAdvancedForecast(
  historicalValues: number[],
  periodLabels: string[],
  nextN = 4,
): ExtendedForecastResult {
  const n = historicalValues.length;

  if (n < 4) {
    // Insufficient data fallback
    return buildFallbackForecast(historicalValues, periodLabels, nextN);
  }

  // 1. Evaluate methods using backtesting (last 30% of data points)
  const backtestCount = Math.max(1, Math.min(3, Math.floor(n * 0.3)));
  const trainLimit = n - backtestCount;

  // Let's compute MAPE for each candidate method
  const mapes = {
    moving_average: evaluateMA(historicalValues, trainLimit, backtestCount),
    weighted_moving_average: evaluateWMA(historicalValues, trainLimit, backtestCount),
    exponential_smoothing: evaluateES(historicalValues, trainLimit, backtestCount, 0.3),
    linear_regression: evaluateLR(historicalValues, trainLimit, backtestCount),
  };

  // Find optimal method (minimum MAPE)
  let bestMethod: keyof typeof mapes = "linear_regression";
  let minMape = Infinity;

  for (const [method, mape] of Object.entries(mapes)) {
    if (mape < minMape) {
      minMape = mape;
      bestMethod = method as keyof typeof mapes;
    }
  }

  // 2. Generate predictions using the optimal method
  let predictions: number[] = [];
  let methodLabel = "";
  let methodExplanation = "";

  if (bestMethod === "moving_average") {
    predictions = forecastMA(historicalValues, nextN, 3);
    methodLabel = "moving_average";
    methodExplanation = `Simple Moving Average (k=3) was selected because it adapts well to recent fluctuations while filtering out short-term noise (MAPE: ${(minMape * 100).toFixed(1)}%).`;
  } else if (bestMethod === "weighted_moving_average") {
    predictions = forecastWMA(historicalValues, nextN, 3);
    methodLabel = "weighted_moving_average";
    methodExplanation = `Weighted Moving Average was selected because it places higher importance on recent values to react quickly to trend shifts (MAPE: ${(minMape * 100).toFixed(1)}%).`;
  } else if (bestMethod === "exponential_smoothing") {
    predictions = forecastES(historicalValues, nextN, 0.3);
    methodLabel = "exponential_smoothing";
    methodExplanation = `Single Exponential Smoothing (alpha=0.3) was selected because the series displays stationary behavior with occasional shifts (MAPE: ${(minMape * 100).toFixed(1)}%).`;
  } else {
    predictions = forecastLR(historicalValues, nextN);
    methodLabel = "holt_trend"; // Maintain type compatibility
    bestMethod = "linear_regression";
    methodExplanation = `Linear Regression Trend fitting was selected because the data shows a strong upward or downward linear trend (MAPE: ${(minMape * 100).toFixed(1)}%).`;
  }

  // 3. Generate future labels
  const nextLabels = generateFutureLabels(periodLabels, nextN);

  // 4. Calculate Confidence Intervals
  // We estimate standard error of predictions from the historical residuals
  const residuals = historicalValues
    .slice(1)
    .map((val, idx) => {
      // simple single-period forecast comparison
      const histPred =
        bestMethod === "moving_average"
          ? forecastMA(historicalValues.slice(0, idx + 1), 1, 3)[0]
          : bestMethod === "weighted_moving_average"
            ? forecastWMA(historicalValues.slice(0, idx + 1), 1, 3)[0]
            : bestMethod === "exponential_smoothing"
              ? forecastES(historicalValues.slice(0, idx + 1), 1, 0.3)[0]
              : forecastLR(historicalValues.slice(0, idx + 1), 1)[0];
      return val - histPred;
    })
    .filter((r) => !isNaN(r));

  const stdError =
    residuals.length > 1 ? ss.standardDeviation(residuals) : ss.mean(historicalValues) * 0.1;

  const nextPeriods = predictions.map((pred, i) => {
    // Confidence bounds widen as we look further into the future (sqrt(i+1) factor)
    const margin = 1.96 * stdError * Math.sqrt(i + 1);
    return {
      period: nextLabels[i],
      predicted: Math.max(0, pred),
      lower: Math.max(0, pred - margin),
      upper: pred + margin,
    };
  });

  // Calculate confidence score (higher if MAPE is lower)
  const confidence = Math.max(0.4, Math.min(0.95, 1 - minMape));

  return {
    method: methodLabel as "moving_average" | "exponential_smoothing" | "holt_trend",
    selectedMethod: bestMethod,
    nextPeriods,
    confidence,
    explanation: methodExplanation,
    mape: minMape,
    assumptions: [
      "The underlying business drivers will remain stable during the forecast period.",
      bestMethod === "linear_regression"
        ? "Historical linear growth/decay trend will continue."
        : "Recent demand levels are indicative of near-term performance.",
    ],
    risks: [
      "Unanticipated supply chain anomalies or external market shocks.",
      "Out-of-sample trend shifts that depart from the calculated historical fit.",
    ],
  };
}

// --- Algorithm Evaluators & Forecasters ---

function evaluateMA(vals: number[], trainLimit: number, testCount: number): number {
  let errors = 0;
  for (let idx = 0; idx < testCount; idx++) {
    const subset = vals.slice(0, trainLimit + idx);
    const pred = forecastMA(subset, 1, 3)[0];
    const actual = vals[trainLimit + idx];
    errors += Math.abs((actual - pred) / (actual || 1));
  }
  return errors / testCount;
}

function forecastMA(vals: number[], count: number, k = 3): number[] {
  const result = [...vals];
  for (let i = 0; i < count; i++) {
    const slice = result.slice(-k);
    const pred = ss.mean(slice);
    result.push(pred);
  }
  return result.slice(-count);
}

function evaluateWMA(vals: number[], trainLimit: number, testCount: number): number {
  let errors = 0;
  for (let idx = 0; idx < testCount; idx++) {
    const subset = vals.slice(0, trainLimit + idx);
    const pred = forecastWMA(subset, 1, 3)[0];
    const actual = vals[trainLimit + idx];
    errors += Math.abs((actual - pred) / (actual || 1));
  }
  return errors / testCount;
}

function forecastWMA(vals: number[], count: number, k = 3): number[] {
  const weights = [0.5, 0.3, 0.2]; // Sums to 1
  const result = [...vals];
  for (let i = 0; i < count; i++) {
    const slice = result.slice(-k);
    // Pad with mean if fewer than k items
    while (slice.length < k) slice.unshift(ss.mean(slice.length ? slice : [0]));

    const pred = slice[2] * weights[0] + slice[1] * weights[1] + slice[0] * weights[2];
    result.push(pred);
  }
  return result.slice(-count);
}

function evaluateES(vals: number[], trainLimit: number, testCount: number, alpha: number): number {
  let errors = 0;
  for (let idx = 0; idx < testCount; idx++) {
    const subset = vals.slice(0, trainLimit + idx);
    const pred = forecastES(subset, 1, alpha)[0];
    const actual = vals[trainLimit + idx];
    errors += Math.abs((actual - pred) / (actual || 1));
  }
  return errors / testCount;
}

function forecastES(vals: number[], count: number, alpha = 0.3): number[] {
  let level = vals[0];
  for (let i = 1; i < vals.length; i++) {
    level = alpha * vals[i] + (1 - alpha) * level;
  }
  return Array(count).fill(level);
}

function evaluateLR(vals: number[], trainLimit: number, testCount: number): number {
  let errors = 0;
  for (let idx = 0; idx < testCount; idx++) {
    const subset = vals.slice(0, trainLimit + idx);
    const pred = forecastLR(subset, 1)[0];
    const actual = vals[trainLimit + idx];
    errors += Math.abs((actual - pred) / (actual || 1));
  }
  return errors / testCount;
}

function forecastLR(vals: number[], count: number): number[] {
  const points = vals.map((y, x) => [x, y]);
  const line = ss.linearRegression(points);
  const lrFn = ss.linearRegressionLine(line);

  const predictions: number[] = [];
  for (let i = 0; i < count; i++) {
    predictions.push(lrFn(vals.length + i));
  }
  return predictions;
}

function generateFutureLabels(labels: string[], nextN: number): string[] {
  if (labels.length === 0) {
    return Array.from({ length: nextN }, (_, i) => `Period ${i + 1}`);
  }

  const lastLabel = labels[labels.length - 1];
  const nextLabels: string[] = [];

  // Attempt to parse date label (e.g. 2024-05, Q2 2024, May 2024, etc.)
  // If numeric period: e.g. "Month 12" -> "Month 13"
  const numMatch = lastLabel.match(/(\d+)/);
  if (numMatch) {
    const prefix = lastLabel.slice(0, numMatch.index);
    const num = parseInt(numMatch[0]);
    const suffix = lastLabel.slice(numMatch.index! + numMatch[0].length);
    for (let i = 1; i <= nextN; i++) {
      nextLabels.push(`${prefix}${num + i}${suffix}`);
    }
    return nextLabels;
  }

  // Fallback: parse date
  const lastDate = new Date(lastLabel);
  if (!isNaN(lastDate.getTime())) {
    for (let i = 1; i <= nextN; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setMonth(lastDate.getMonth() + i);
      const isIso = lastLabel.includes("-");
      nextLabels.push(
        isIso
          ? nextDate.toISOString().slice(0, 7)
          : nextDate.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            }),
      );
    }
    return nextLabels;
  }

  // Default labels
  for (let i = 1; i <= nextN; i++) {
    nextLabels.push(`Period +${i}`);
  }
  return nextLabels;
}

function buildFallbackForecast(
  vals: number[],
  labels: string[],
  nextN: number,
): ExtendedForecastResult {
  const mean = vals.length > 0 ? ss.mean(vals) : 100;
  const nextLabels = generateFutureLabels(labels, nextN);
  const nextPeriods = Array.from({ length: nextN }, (_, i) => ({
    period: nextLabels[i],
    predicted: mean,
    lower: mean * 0.7,
    upper: mean * 1.3,
  }));

  return {
    method: "moving_average",
    selectedMethod: "moving_average",
    nextPeriods,
    confidence: 0.5,
    explanation:
      "Simple average baseline was selected due to insufficient historical periods (< 4) for advanced models.",
    mape: 0.3,
    assumptions: ["Historical averages represent future levels."],
    risks: ["Extreme volatility or data structural shifts."],
  };
}
