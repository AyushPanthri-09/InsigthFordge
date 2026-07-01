import * as ss from "simple-statistics";
import { prettify } from "../eda";
import type { TimeSeriesAnalysis } from "../../types";

export interface AnomalyResult {
  id: string;
  type:
    | "outlier"
    | "fraud"
    | "impossible_value"
    | "negative_inventory"
    | "negative_revenue"
    | "duplicate_transaction"
    | "large_spike"
    | "large_drop"
    | "seasonality_break"
    | "missing_date";
  column?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  affectedRowCount?: number;
  remedy?: string;
}

/**
 * Automatically detects outliers, impossible values, fraud patterns, and time-series breaks.
 */
export function detectAnomalies(
  rows: Record<string, unknown>[],
  columns: string[],
  numericColumns: string[],
  timeSeriesArr: TimeSeriesAnalysis[]
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  let anomalyIdCounter = 0;

  // Helpers
  const nextId = () => `anomaly_${anomalyIdCounter++}`;

  // 1. Check for Duplicate Transactions (identical values on ID/entity + date + amount)
  // Let's identify columns representing Customer/User, Date, and Amount
  const dateCol = columns.find(c => c.toLowerCase().includes("date") || c.toLowerCase().includes("time"));
  const amtCol = numericColumns.find(c => ["revenue", "sales", "amount", "price", "total", "grand_total"].includes(c.toLowerCase()));
  const custCol = columns.find(c => ["customer_id", "user_id", "email", "card", "account"].some(k => c.toLowerCase().includes(k)));

  if (dateCol && amtCol) {
    const transactions = new Map<string, number[]>();
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const key = `${row[custCol ?? ""]}|${row[dateCol]}|${row[amtCol]}`;
      if (!transactions.has(key)) {
        transactions.set(key, []);
      }
      transactions.get(key)!.push(idx);
    }

    let duplicateCount = 0;
    for (const [_, indices] of transactions.entries()) {
      if (indices.length > 1) {
        duplicateCount += indices.length - 1;
      }
    }

    if (duplicateCount > 0) {
      anomalies.push({
        id: nextId(),
        type: "duplicate_transaction",
        severity: duplicateCount > rows.length * 0.05 ? "HIGH" : "MEDIUM",
        description: `Detected ${duplicateCount} duplicate transactions having identical identifiers, date/timestamps, and financial amounts.`,
        affectedRowCount: duplicateCount,
        remedy: "Filter out exact duplicates or review logs for payment gateway double-triggers."
      });
    }
  }

  // 2. Check for Negative Inventory and Negative Revenue/Sales (Impossible Values)
  for (const col of numericColumns) {
    const isInventory = ["inventory", "stock", "stock_level", "qty_on_hand", "quantity", "qty"].some(k => col.toLowerCase().includes(k));
    const isRevenue = ["revenue", "sales", "price", "amount", "total", "grand_total"].some(k => col.toLowerCase().includes(k));

    if (isInventory || isRevenue) {
      const negativeRows = rows.filter(r => {
        const v = Number(r[col]);
        return Number.isFinite(v) && v < 0;
      });

      if (negativeRows.length > 0) {
        anomalies.push({
          id: nextId(),
          type: isInventory ? "negative_inventory" : "negative_revenue",
          column: col,
          severity: negativeRows.length > rows.length * 0.01 ? "CRITICAL" : "HIGH",
          description: `Column '${prettify(col)}' contains ${negativeRows.length} negative values. Negative ${isInventory ? "inventory quantities" : "revenue amounts"} represent physical or accounting errors.`,
          affectedRowCount: negativeRows.length,
          remedy: isInventory
            ? "Verify stock adjustment logs and write-off codes."
            : "Review refunds/chargebacks processing or treat negative entries as adjustment journals."
        });
      }
    }
  }

  // 3. Statistical Outliers via Z-score
  for (const col of numericColumns) {
    const vals = rows
      .map(r => Number(r[col]))
      .filter(v => Number.isFinite(v));

    if (vals.length >= 10) {
      const meanVal = ss.mean(vals);
      const stdevVal = ss.standardDeviation(vals);

      if (stdevVal > 0) {
        const outliers = vals.filter(v => Math.abs((v - meanVal) / stdevVal) > 3.0);
        if (outliers.length > 0) {
          const isHighSeverity = outliers.length > vals.length * 0.03;
          anomalies.push({
            id: nextId(),
            type: "outlier",
            column: col,
            severity: isHighSeverity ? "HIGH" : "LOW",
            description: `Detected ${outliers.length} extreme statistical outliers (Z-score > 3.0) in column '${prettify(col)}'. Max outlier value: ${Math.max(...outliers.map(Math.abs))}.`,
            affectedRowCount: outliers.length,
            remedy: "Verify data source formatting or apply Winsorization/clipping techniques to reduce outlier leverage in ML models."
          });
        }
      }
    }
  }

  // 4. Time Series Anomalies (Spikes, Drops, Seasonality Breaks, Missing Dates)
  for (const ts of timeSeriesArr) {
    // Spikes & Drops
    const anomalyPeriods = ts.periods.filter((p: any) => p.isAnomaly);
    for (const ap of anomalyPeriods) {
      const isSpike = (ap.zScore ?? 0) > 0;
      anomalies.push({
        id: nextId(),
        type: isSpike ? "large_spike" : "large_drop",
        column: ts.measureColumn,
        severity: Math.abs(ap.zScore ?? 0) > 3.0 ? "HIGH" : "MEDIUM",
        description: `Time series '${prettify(ts.measureColumn)}' showed a large ${isSpike ? "spike" : "drop"} in period ${ap.period} (z-score: ${(ap.zScore ?? 0).toFixed(2)}).`,
        remedy: "Drill down into transaction activity during this period to identify promotional events or operational disruptions."
      });
    }

    // Missing Dates check
    // We can guess if there are missing dates if the sequence has holes
    if (ts.periods.length > 4) {
      // Analyze date granularity and check gaps
      // Simple heuristic: if values of date are temporal, sort them and look for gaps
      const hasGaps = checkTimeGaps(ts.periods.map((p: any) => p.period), ts.granularity);
      if (hasGaps) {
        anomalies.push({
          id: nextId(),
          type: "missing_date",
          column: ts.dateColumn,
          severity: "MEDIUM",
          description: `Timeline gaps detected in date column '${prettify(ts.dateColumn)}' relative to expected ${ts.granularity}ly intervals.`,
          remedy: "Fill missing date intervals with zero or carry-forward imputations."
        });
      }
    }
  }

  return anomalies;
}

function checkTimeGaps(periods: string[], granularity: string): boolean {
  if (periods.length < 5) return false;
  // Parse periods
  const dates = periods
    .map(p => new Date(p))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length < 5) return false;

  let gapCount = 0;
  let expectedDiff = 0;

  if (granularity === "day") expectedDiff = 24 * 60 * 60 * 1000;
  else if (granularity === "week") expectedDiff = 7 * 24 * 60 * 60 * 1000;
  else if (granularity === "month") expectedDiff = 30 * 24 * 60 * 60 * 1000;
  else return false; // ignore complex granularity gaps

  for (let i = 1; i < dates.length; i++) {
    const diff = dates[i].getTime() - dates[i - 1].getTime();
    if (diff > expectedDiff * 1.5) {
      gapCount++;
    }
  }

  return gapCount > 0;
}
