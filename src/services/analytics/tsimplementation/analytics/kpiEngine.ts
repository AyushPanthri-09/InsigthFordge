import type { BusinessDomain, KPI } from "../../types";
import { DOMAIN_KPIS, type KPIMapping } from "./businessRules";
import * as ss from "simple-statistics";

/**
 * Finds a matching column name in the dataset.
 * Compares lowercase and removes symbols to maximize match likelihood.
 */
export function findMatchingColumn(
  columns: string[],
  possibleColumns: string[],
): string | undefined {
  const normCols = columns.map((c) => ({
    original: c,
    normalized: c.toLowerCase().replace(/[_\-\s]+/g, ""),
  }));

  for (const pos of possibleColumns) {
    const normPos = pos.toLowerCase().replace(/[_\-\s]+/g, "");
    const found = normCols.find(
      (nc) =>
        nc.normalized === normPos ||
        nc.normalized.includes(normPos) ||
        normPos.includes(nc.normalized),
    );
    if (found) return found.original;
  }
  return undefined;
}

/**
 * Computes a specific KPI from dataset rows.
 */
export function computeSingleKPI(
  rows: Record<string, unknown>[],
  kpiMap: KPIMapping,
  colName: string,
): KPI {
  const values = rows.map((r) => r[colName]);

  let calculatedValue: number | string = 0;
  let rationale = kpiMap.rationale;
  let confidence = 0.85;

  if (kpiMap.aggregation === "count") {
    // Unique count for IDs / Keys, non-null count for others
    const nonNulls = values.filter((v) => v !== null && v !== undefined && v !== "");
    const isIdOrKey =
      colName.toLowerCase().includes("id") ||
      colName.toLowerCase().includes("number") ||
      colName.toLowerCase().includes("code");
    if (isIdOrKey) {
      const uniques = new Set(nonNulls.map((v) => String(v)));
      calculatedValue = uniques.size;
      rationale = `Calculated unique count of '${colName}'. Total: ${uniques.size} entities.`;
    } else {
      calculatedValue = nonNulls.length;
      rationale = `Calculated non-null count of '${colName}'. Total: ${nonNulls.length} records.`;
    }
  } else {
    // Numeric metrics
    const numericValues = values
      .map((v) => {
        if (typeof v === "number") return v;
        if (typeof v === "string") {
          const clean = v.replace(/[$£€¥₹%,]/g, "").trim();
          const parsed = Number(clean);
          return Number.isFinite(parsed) ? parsed : NaN;
        }
        if (typeof v === "boolean") return v ? 1 : 0;
        return NaN;
      })
      .filter((v) => !isNaN(v));

    if (numericValues.length === 0) {
      calculatedValue = 0;
      rationale = `Failed to find valid numeric values in column '${colName}'.`;
      confidence = 0.3;
    } else if (kpiMap.aggregation === "sum") {
      calculatedValue = ss.sum(numericValues);
      rationale = `Calculated sum of '${colName}' across ${numericValues.length} rows.`;
    } else if (kpiMap.aggregation === "avg") {
      calculatedValue = ss.mean(numericValues);
      rationale = `Calculated average of '${colName}' across ${numericValues.length} rows.`;
    } else if (kpiMap.aggregation === "rate") {
      // For rates, check if the column contains raw percentages or is boolean
      const isBooleanLike = numericValues.every(
        (v) => Math.abs(v) < 1e-9 || Math.abs(v - 1) < 1e-9,
      );
      if (isBooleanLike) {
        const trues = numericValues.filter((v) => v === 1).length;
        calculatedValue = (trues / numericValues.length) * 100;
        rationale = `Calculated rate of occurrences in '${colName}' (${trues}/${numericValues.length}).`;
      } else {
        // Average rate representation
        const meanVal = ss.mean(numericValues);
        // If mean is between 0 and 1, represent as percentage 0-100
        calculatedValue = meanVal <= 1 && meanVal >= 0 ? meanVal * 100 : meanVal;
        rationale = `Calculated average rate in '${colName}' across ${numericValues.length} rows.`;
      }
    }
  }

  // Format values nicely
  let formattedValue = String(calculatedValue);
  const numValue = Number(calculatedValue);
  if (Number.isFinite(numValue)) {
    if (kpiMap.unit === "%") {
      formattedValue = `${numValue.toFixed(1)}%`;
    } else if (kpiMap.unit === "$") {
      formattedValue = `$${formatMoney(numValue)}`;
    } else {
      formattedValue = numValue.toLocaleString(undefined, {
        maximumFractionDigits: 1,
      });
    }
  }

  return {
    id: `kpi_${kpiMap.key}_${colName}`,
    label: kpiMap.name,
    value: calculatedValue,
    formattedValue,
    unit: kpiMap.unit,
    confidence,
    rationale,
  };
}

function formatMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(2);
}

/**
 * Automatically detects and computes KPIs based on the business domain and columns.
 */
export function detectAndComputeKPIs(
  rows: Record<string, unknown>[],
  columns: string[],
  domain: BusinessDomain,
): KPI[] {
  const kpis: KPI[] = [];

  // Get KPIs specified for this domain (fallback to generic)
  const mappings = DOMAIN_KPIS[domain] || DOMAIN_KPIS.generic;

  for (const mapping of mappings) {
    const matchedCol = findMatchingColumn(columns, mapping.possibleColumns);
    if (matchedCol) {
      try {
        kpis.push(computeSingleKPI(rows, mapping, matchedCol));
      } catch (e) {
        console.warn(`Error computing KPI '${mapping.name}':`, e);
      }
    }
  }

  // Always compute general KPIs (total records) as fallback / addition
  kpis.unshift({
    id: "kpi_total_records",
    label: "Total Records",
    value: rows.length,
    formattedValue: rows.length.toLocaleString(),
    confidence: 1.0,
    rationale: "Total number of cleaned records.",
  });

  return kpis;
}
