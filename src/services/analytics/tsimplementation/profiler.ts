/**
 * Profiler
 * --------
 * Produces ColumnProfile[] from raw dataset rows.
 *
 * Phase 1 upgrade: integrates three new engines while preserving the
 * exact same public API so no downstream code breaks.
 *
 *  - Business Context Engine  → domain, process, entity, KPI inference
 *  - Column Intelligence Engine → semantic meaning, schema role, tags
 *  - Relationship Discovery Engine → PK/FK, hierarchies, measure-dimension links
 *
 * Public API (unchanged):
 *   profileColumn(name, values, totalRows) → ColumnProfile
 *   profileAll(rows, columns) → ColumnProfile[]
 *   detectDomainHeuristic(columns) → { domain, confidence }
 *
 * New additions (opt-in, used by tsimplementation/index.ts):
 *   profileDataset(rows, columns) → EnrichedProfileResult
 */

import * as ss from "simple-statistics";
import type {
  BusinessDomain,
  ColumnIntelligence,
  ColumnProfile,
  ColumnRelationship,
  ColumnSemanticType,
  NumericStats,
  TimeIntelligence,
} from "../types";
import {
  analyseAllColumns,
  buildFactDimensionMap,
  extractMeasuresAndDimensions,
} from "./column-intelligence";
import {
  inferBusinessDomain,
  inferBusinessProcesses,
  extractPrimaryEntities,
  suggestKPICandidates,
} from "./business-context";
import { discoverAllRelationships } from "./relationship-discovery";

// ---------------------------------------------------------------------------
// Type-detection utilities (unchanged from original, kept stable)
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\//i;
const ID_HINT = /(^id$|_id$|^uuid$|guid|code|sku|order(_)?number)/i;

export function inferType(values: unknown[]): ColumnSemanticType {
  const nonNull = values.filter(
    (v) => v !== null && v !== undefined && v !== "",
  );
  return inferTypeFromNonNull(nonNull);
}

/**
 * Core type-inference logic operating on a pre-filtered non-null array.
 * Called by inferType() (which filters first) and profileColumn() (which
 * already holds the filtered array, avoiding a second O(n) pass).
 */
function inferTypeFromNonNull(nonNull: unknown[]): ColumnSemanticType {
  if (!nonNull.length) return "unknown";
  const sample = nonNull.slice(0, 200);
  let numericCount = 0;
  let dateCount = 0;
  let boolCount = 0;
  let emailCount = 0;
  let urlCount = 0;

  for (const v of sample) {
    const stringValue = String(v);
    if (
      typeof v === "number" ||
      (!isNaN(parseFloat(stringValue)) && isFinite(Number(v)))
    ) {
      numericCount++;
    }
    if (v instanceof Date || (typeof v === "string" && DATE_RE.test(v))) {
      dateCount++;
    }
    if (
      v === true ||
      v === false ||
      /^(true|false|yes|no|y|n)$/i.test(stringValue)
    ) {
      boolCount++;
    }
    if (typeof v === "string" && EMAIL_RE.test(v)) {
      emailCount++;
    }
    if (typeof v === "string" && URL_RE.test(v)) {
      urlCount++;
    }
  }

  if (emailCount / sample.length > 0.7) return "email";
  if (urlCount / sample.length > 0.7) return "url";
  if (boolCount / sample.length > 0.7) return "boolean";
  if (dateCount / sample.length > 0.7) return "datetime";
  if (numericCount / sample.length > 0.85) return "numeric_measure";
  return "categorical";
}

// ---------------------------------------------------------------------------
// Column profiler (public API preserved, ColumnIntelligence added as optional)
// ---------------------------------------------------------------------------

export function profileColumn(
  name: string,
  values: unknown[],
  totalRows: number,
): ColumnProfile {
  const nonNull = values.filter(
    (v) => v !== null && v !== undefined && v !== "",
  );
  const unique = new Set(nonNull.map((v) => String(v)));
  // Reuse the already-computed nonNull array — avoids a second O(n) filter inside inferType().
  const inferredType = inferTypeFromNonNull(nonNull);
  const isLikelyId =
    ID_HINT.test(name) ||
    (unique.size === nonNull.length && nonNull.length > 5);

  let role: ColumnProfile["inferredRole"] = "dimension";
  if (inferredType === "datetime" || inferredType === "date") role = "date";
  else if (inferredType === "numeric_measure" && !isLikelyId) role = "measure";
  else if (isLikelyId) role = "key";

  let stats: NumericStats | undefined;
  if (role === "measure") {
    const nums: number[] = [];
    for (const v of nonNull) {
      const n = Number(v);
      if (Number.isFinite(n)) nums.push(n);
    }
    if (nums.length > 1) {
      const q1 = ss.quantile(nums, 0.25);
      const q3 = ss.quantile(nums, 0.75);
      const iqr = q3 - q1;
      const lo = q1 - 1.5 * iqr;
      const hi = q3 + 1.5 * iqr;
      let outlierCount = 0;
      for (const n of nums) {
        if (n < lo || n > hi) outlierCount++;
      }
      stats = {
        min: ss.min(nums),
        max: ss.max(nums),
        mean: ss.mean(nums),
        median: ss.median(nums),
        stdev: nums.length > 1 ? ss.standardDeviation(nums) : 0,
        q1,
        q3,
        outlierCount,
      };
    }
  }

  return {
    name,
    inferredType: isLikelyId
      ? inferredType === "numeric_measure"
        ? "identifier"
        : inferredType
      : inferredType,
    inferredRole: role,
    nonNullCount: nonNull.length,
    nullCount: totalRows - nonNull.length,
    uniqueCount: unique.size,
    sampleValues: Array.from(unique).slice(0, 6),
    stats,
    // intelligence is populated by profileDataset() below
  };
}

/** Profiles every column — public API unchanged. */
export function profileAll(
  rows: Record<string, unknown>[],
  columns: string[],
): ColumnProfile[] {
  return columns.map((col) =>
    profileColumn(
      col,
      rows.map((r) => r[col]),
      rows.length,
    ),
  );
}

// ---------------------------------------------------------------------------
// Legacy domain heuristic (preserved exactly — used as fallback)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use inferBusinessDomain() from business-context.ts for richer
 * results. This function is kept for backward compatibility only.
 */
export function detectDomainHeuristic(columns: string[]): {
  domain: BusinessDomain;
  confidence: number;
} {
  const result = inferBusinessDomain(columns);
  return { domain: result.domain, confidence: result.confidence };
}

// ---------------------------------------------------------------------------
// NEW: Full enriched profiling pass (Phase 1 addition)
// ---------------------------------------------------------------------------

/** The enriched output produced by a full profiling pass. */
export interface EnrichedProfileResult {
  /** Standard column profiles (backward compatible). */
  profiles: ColumnProfile[];
  /** Per-column semantic intelligence. */
  intelligence: Record<string, ColumnIntelligence>;
  /** Discovered structural and semantic relationships. */
  relationships: ColumnRelationship[];
  /** Time intelligence (null if no date columns found). */
  timeIntelligence: TimeIntelligence | null;
  /** Fact vs dimension classification per column. */
  factDimensionMap: Record<string, "fact" | "dimension" | "unknown">;
  /** Inferred business domain with full rationale. */
  domain: {
    value: BusinessDomain;
    confidence: number;
    rationale: string;
    processName: string;
    coreEntities: string[];
    kpiHints: string[];
    purposeTemplate: string;
  };
  /** Extracted measure column summaries. */
  measures: Array<{
    column: string;
    aggregation: "sum" | "avg" | "count" | "max" | "min" | "rate";
    unit?: string;
    businessMeaning: string;
  }>;
  /** Extracted dimension column summaries. */
  dimensions: Array<{
    column: string;
    hierarchy?: string[];
    cardinality: "low" | "medium" | "high";
    businessMeaning: string;
  }>;
  /** KPI candidates computed once during profiling — reuse downstream instead of calling suggestKPICandidates() again. */
  suggestedKPIs: Array<{ name: string; rationale: string; columns: string[] }>;
  /** Business processes inferred from domain + column signals — computed once here, reused downstream. */
  businessProcesses: import("../types").BusinessProcess[];
  /** Primary entities detected from column names — computed once here, reused downstream. */
  primaryEntities: string[];
}

/**
 * Full enriched profiling pass.
 *
 * Orchestration order:
 *  1. Basic profiling (stable, unchanged)
 *  2. Domain inference (Business Context Engine)
 *  3. Column intelligence (Column Intelligence Engine)
 *  4. Relationship discovery (Relationship Discovery Engine)
 *  5. Fact/dimension map construction
 *  6. Measures + dimensions extraction
 *
 * This function is called by tsimplementation/index.ts and its output flows
 * into DatasetUnderstanding, EDA, and the AI reasoning prompts.
 */
export function profileDataset(
  rows: Record<string, unknown>[],
  columns: string[],
): EnrichedProfileResult {
  // Step 1 — Basic profiling (all existing logic, unchanged)
  const profiles = profileAll(rows, columns);

  // Step 2 — Domain inference using Business Context Engine
  // Extract flat string sample values for value-signal matching
  const sampleValues: string[] = [];
  for (let i = 0; i < Math.min(100, rows.length); i++) {
    const row = rows[i];
    for (const value of Object.values(row)) {
      if (typeof value === "string") sampleValues.push(value);
    }
  }

  const domainResult = inferBusinessDomain(columns, sampleValues);

  // Step 3 — Column intelligence (semantic analysis per column)
  const intelligence = analyseAllColumns(profiles, domainResult.domain);

  // Attach intelligence back to profiles so it travels downstream
  for (const p of profiles) {
    const intel = intelligence[p.name];
    if (intel) {
      p.intelligence = intel;
      // Also populate the existing businessMeaning field for UI backward compat
      if (!p.businessMeaning) {
        p.businessMeaning = intel.businessMeaning;
      }
    }
  }

  // Step 4 — Relationship discovery
  const { relationships, timeIntelligence } = discoverAllRelationships(
    profiles,
    intelligence,
    rows,
  );

  // Step 5 — Fact/dimension map
  const factDimensionMap = buildFactDimensionMap(profiles, intelligence);

  // Step 6 — Measures and dimensions extraction
  const { measures, dimensions } = extractMeasuresAndDimensions(
    profiles,
    intelligence,
  );

  // Step 7 — KPI candidate suggestions (computed once here; callers read enriched.suggestedKPIs)
  const suggestedKPIs = suggestKPICandidates(columns, domainResult.domain);

  // Step 8 — Business processes and primary entities (computed once here; callers read enriched fields)
  const businessProcesses = inferBusinessProcesses(
    columns,
    domainResult.domain,
  );
  const primaryEntities = extractPrimaryEntities(columns, domainResult.domain);

  return {
    profiles,
    intelligence,
    relationships,
    timeIntelligence,
    factDimensionMap,
    domain: {
      value: domainResult.domain,
      confidence: domainResult.confidence,
      rationale: domainResult.rationale,
      processName: domainResult.processName,
      coreEntities: domainResult.coreEntities,
      kpiHints: domainResult.kpiHints,
      purposeTemplate: domainResult.purposeTemplate,
    },
    measures,
    dimensions,
    suggestedKPIs,
    businessProcesses,
    primaryEntities,
  };
}

// Re-export helpers used by other modules (avoids import path changes)
export {
  inferBusinessDomain,
  inferBusinessProcesses,
  extractPrimaryEntities,
  suggestKPICandidates,
};
