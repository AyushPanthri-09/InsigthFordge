import type { ColumnProfile } from "../../types";
import { QUALITY_WEIGHTS } from "./businessRules";
import { AnomalyResult } from "./anomalyEngine";

export interface DataQualityReport {
  overallScore: number;
  categoryScores: {
    completeness: number;
    uniqueness: number;
    consistency: number;
    validity: number;
    typeAlignment: number;
  };
  recommendations: string[];
}

/**
 * Computes a data quality score (0-100) and outlines cleaning suggestions.
 */
export function calculateDataQuality(
  rows: Record<string, unknown>[],
  profiles: ColumnProfile[],
  anomalies: AnomalyResult[],
  duplicateRowCount = 0,
): DataQualityReport {
  const recommendations: string[] = [];

  if (rows.length === 0 || profiles.length === 0) {
    return {
      overallScore: 0,
      categoryScores: {
        completeness: 0,
        uniqueness: 0,
        consistency: 0,
        validity: 0,
        typeAlignment: 0,
      },
      recommendations: ["Ensure the dataset file contains valid headers and row records."],
    };
  }

  // 1. Completeness Score (Missing values)
  const totalCells = rows.length * profiles.length;
  const nullCount = profiles.reduce((sum, p) => sum + p.nullCount, 0);
  const completeness = totalCells > 0 ? ((totalCells - nullCount) / totalCells) * 100 : 100;

  if (completeness < 95) {
    recommendations.push(
      `Fill missing values (completeness: ${completeness.toFixed(1)}%). Consider inputing missing fields or reviewing import pipelines.`,
    );
  }

  // 2. Uniqueness Score (Duplicates)
  const uniqueness =
    rows.length > 0 ? ((rows.length - duplicateRowCount) / rows.length) * 100 : 100;
  if (duplicateRowCount > 0) {
    recommendations.push(
      `Remove ${duplicateRowCount} duplicate rows to ensure exact uniqueness representation.`,
    );
  }

  // 3. Consistency (Outliers)
  let totalOutlierCount = 0;
  let numericColumnsCount = 0;
  for (const p of profiles) {
    if (p.stats) {
      totalOutlierCount += p.stats.outlierCount;
      numericColumnsCount++;
    }
  }

  const totalNumericCells = rows.length * Math.max(1, numericColumnsCount);
  const consistency =
    totalNumericCells > 0 ? Math.max(0, (1 - totalOutlierCount / totalNumericCells) * 100) : 100;
  if (totalOutlierCount > 0) {
    recommendations.push(
      `Investigate ${totalOutlierCount} statistical outliers found in numerical measures.`,
    );
  }

  // 4. Validity Score (Impossible Values / Anomalies)
  // We count high-severity anomalies like negative inventory or duplicate transactions
  const validityAnomalies = anomalies.filter(
    (a) =>
      a.type === "negative_inventory" ||
      a.type === "negative_revenue" ||
      a.type === "duplicate_transaction",
  );
  const validityScore = Math.max(0, 100 - validityAnomalies.length * 10);

  if (validityAnomalies.length > 0) {
    recommendations.push(
      `Resolve ${validityAnomalies.length} validity warnings including impossible negative inventory or revenue values.`,
    );
  }

  // 5. Type Alignment Score
  // Proportion of columns that match their expected semantic format
  let mismatchCount = 0;
  for (const p of profiles) {
    // Basic check: if profile role is measure but stats has zero valid values, or has text values
    if (p.inferredRole === "measure" && p.nonNullCount > 0 && (!p.stats || isNaN(p.stats.mean))) {
      mismatchCount++;
    }
  }
  const typeAlignment = Math.max(0, ((profiles.length - mismatchCount) / profiles.length) * 100);
  if (mismatchCount > 0) {
    recommendations.push(
      `Re-align data types for ${mismatchCount} columns containing non-numeric values in numeric measures.`,
    );
  }

  // Calculate weighted overall score
  const overallScore = Math.round(
    completeness * QUALITY_WEIGHTS.completeness +
      uniqueness * QUALITY_WEIGHTS.uniqueness +
      consistency * QUALITY_WEIGHTS.outliers +
      validityScore * QUALITY_WEIGHTS.validity +
      typeAlignment * QUALITY_WEIGHTS.consistency,
  );

  // If data is in perfect shape
  if (recommendations.length === 0) {
    recommendations.push("Data quality is excellent. No cleaning interventions recommended.");
  }

  return {
    overallScore,
    categoryScores: {
      completeness,
      uniqueness,
      consistency,
      validity: validityScore,
      typeAlignment,
    },
    recommendations,
  };
}
