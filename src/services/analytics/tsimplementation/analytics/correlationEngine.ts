import * as ss from "simple-statistics";
import { CORRELATION_THRESHOLDS } from "./businessRules";
import { prettify } from "../eda";

export interface CorrelationResult {
  a: string;
  b: string;
  r: number;
  strength:
    | "strong_positive"
    | "strong_negative"
    | "moderate_positive"
    | "moderate_negative"
    | "weak";
  explanation: string;
}

/**
 * Computes Pearson correlation coefficients for all numeric column pairs.
 */
export function computeCorrelationMatrix(
  rows: Record<string, unknown>[],
  numericColumns: string[],
): CorrelationResult[] {
  const results: CorrelationResult[] = [];

  if (numericColumns.length < 2) return results;

  // Extract and clean values for numerical columns first to avoid repeated conversions
  const colVectors = new Map<string, number[]>();
  for (const col of numericColumns) {
    const vec = rows.map((r) => {
      const v = r[col];
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const parsed = Number(v.replace(/[$£€¥₹%,]/g, "").trim());
        return Number.isFinite(parsed) ? parsed : NaN;
      }
      return NaN;
    });
    colVectors.set(col, vec);
  }

  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i + 1; j < numericColumns.length; j++) {
      const colA = numericColumns[i];
      const colB = numericColumns[j];

      const vecA = colVectors.get(colA)!;
      const vecB = colVectors.get(colB)!;

      // Align values where both columns have finite numerical entries
      const xs: number[] = [];
      const ys: number[] = [];

      for (let k = 0; k < rows.length; k++) {
        const valA = vecA[k];
        const valB = vecB[k];
        if (!isNaN(valA) && !isNaN(valB)) {
          xs.push(valA);
          ys.push(valB);
        }
      }

      // We need at least 5 pairs to calculate correlation reliably
      if (xs.length < 5) continue;

      try {
        const r = ss.sampleCorrelation(xs, ys);
        if (!Number.isFinite(r)) continue;

        const absR = Math.abs(r);
        let strength: CorrelationResult["strength"] = "weak";
        let strengthText = "";

        if (absR >= CORRELATION_THRESHOLDS.strong) {
          strength = r > 0 ? "strong_positive" : "strong_negative";
          strengthText = r > 0 ? "strong positive" : "strong negative";
        } else if (absR >= CORRELATION_THRESHOLDS.moderate) {
          strength = r > 0 ? "moderate_positive" : "moderate_negative";
          strengthText = r > 0 ? "moderate positive" : "moderate negative";
        } else {
          strength = "weak";
          strengthText = "weak";
        }

        const labelA = prettify(colA);
        const labelB = prettify(colB);

        const explanation =
          strength === "weak"
            ? `There is a weak or negligible linear relationship between ${labelA} and ${labelB} (${r.toFixed(2)}).`
            : `${labelA} has a ${strengthText} correlation with ${labelB} (${r.toFixed(2)}).`;

        results.push({
          a: colA,
          b: colB,
          r,
          strength,
          explanation,
        });
      } catch (e) {
        // Skip on calculations error (like constant values)
      }
    }
  }

  // Sort by correlation strength absolute value descending
  return results.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
}
