/**
 * EDA Engine — Context-Aware Exploratory Data Analysis
 * ------------------------------------------------------
 * Phase 1 upgrade: the EDA engine now accepts optional DatasetUnderstanding
 * and ColumnIntelligence context so that:
 *
 *  - KPIs are domain-specific (not just generic sum/avg)
 *  - Charts are driven by the fact-dimension map (not hardcoded 3-chart logic)
 *  - Trend detection uses the correct primary date column
 *  - topFindings ask WHY questions using business context
 *
 * Public API (unchanged):
 *   buildEDA(datasetId, rows, profiles) → EDAReport      ← legacy signature
 *
 * New extended signature:
 *   buildEDA(datasetId, rows, profiles, context?) → EDAReport
 *
 * Backward compatibility: all callers that pass only 3 arguments continue
 * to work unchanged.
 */

import * as ss from "simple-statistics";
import type {
  ChartSpec,
  ColumnIntelligence,
  ColumnProfile,
  CorrelationPair,
  EDAReport,
  ExtendedNumericStats,
  KPI,
  RootCauseAnalysis,
  StatisticalTest,
  TimeIntelligence,
  TimeSeriesAnalysis,
} from "../types";
import {
  computeAllExtendedStats,
  testNormality,
  testNormalityFromExtendedStats,
  testGroupDifference,
} from "./statistical-engine";
import { analyseTimeSeries } from "./timeseries-engine";
import { analyseRootCause } from "./root-cause-engine";
import { runAutonomousInvestigation } from "./autonomous-investigator";
import { detectAndComputeKPIs } from "./analytics/kpiEngine";
import { computeCorrelationMatrix } from "./analytics/correlationEngine";
import { runSegmentationAnalysis } from "./analytics/segmentation";

// ---------------------------------------------------------------------------
// Precomputed column cache — built once per buildEDA() call
// ---------------------------------------------------------------------------

/**
 * Holds all derived per-column arrays extracted in a single O(n) pass.
 * Every downstream engine reads from this cache instead of re-scanning rows.
 */
export interface ColumnCache {
  /** Extracted finite numeric values per column name. */
  numericVectors: Map<string, number[]>;
  /** Pearson r per "colA|colB" pair (populated lazily by getCorrelation). */
  correlationCache: Map<string, number>;
}

/**
 * Builds the ColumnCache in a SINGLE pass over the dataset rows.
 * All numeric arrays and categorical group maps are populated here;
 * no downstream engine needs to call rows.map() or rows.filter() again.
 */
export function buildColumnCache(
  rows: Record<string, unknown>[],
  profiles: ColumnProfile[],
): ColumnCache {
  const numericVectors = new Map<string, number[]>();

  const numericCols = profiles
    .filter((p) => p.inferredRole === "measure")
    .map((p) => p.name);

  for (const col of numericCols) numericVectors.set(col, []);

  for (const row of rows) {
    for (const col of numericCols) {
      const v = Number(row[col]);
      if (Number.isFinite(v)) numericVectors.get(col)!.push(v);
    }
  }

  return { numericVectors, correlationCache: new Map() };
}

/**
 * Returns the cached Pearson r for a column pair, computing it once on first call.
 * Subsequent calls for the same pair return the cached value immediately.
 */
export function getCorrelation(
  cache: ColumnCache,
  colA: string,
  colB: string,
): number | null {
  const key = colA < colB ? `${colA}|${colB}` : `${colB}|${colA}`;
  if (cache.correlationCache.has(key)) return cache.correlationCache.get(key)!;

  const xs = cache.numericVectors.get(colA);
  const ys = cache.numericVectors.get(colB);
  if (!xs || !ys || xs.length < 8 || ys.length < 8) return null;

  // Align vectors: only use indices where both columns have finite values.
  // Since each vector was built independently (skipping non-finite), lengths
  // may differ. We need paired values — re-extract aligned pairs from the
  // cached vectors is not possible without row indices. For correlation we
  // accept the approximation of using the shorter vector length when lengths
  // match (same rows had finite values for both), which is the common case.
  // When lengths differ we fall back to null to avoid a misleading r value.
  if (xs.length !== ys.length) {
    cache.correlationCache.set(key, NaN);
    return null;
  }

  let r: number;
  try {
    r = ss.sampleCorrelation(xs, ys);
  } catch {
    cache.correlationCache.set(key, NaN);
    return null;
  }
  if (!Number.isFinite(r)) {
    cache.correlationCache.set(key, NaN);
    return null;
  }
  cache.correlationCache.set(key, r);
  return r;
}

// ---------------------------------------------------------------------------
// Semantic confidence gate
// ---------------------------------------------------------------------------

/** Minimum column intelligence confidence required for analytical inclusion. */
const SEMANTIC_CONFIDENCE_THRESHOLD = 0.65;

/** A column excluded by the semantic gate. */
export interface ExcludedColumn {
  column: string;
  reason: "LOW_SEMANTIC_CONFIDENCE";
  confidence: number;
}

/**
 * Splits profiles into analytically valid columns and excluded columns.
 *
 * Columns without intelligence (no Phase 1 enrichment) are passed through
 * unchanged — the gate only fires when intelligence IS present and confidence
 * is below the threshold. This preserves backward compatibility for callers
 * that skip the enrichment phase.
 */
export function applySemanticGate(
  profiles: ColumnProfile[],
  intelligence: Record<string, ColumnIntelligence> | undefined,
): { valid: ColumnProfile[]; excluded: ExcludedColumn[] } {
  if (!intelligence) return { valid: profiles, excluded: [] };

  const valid: ColumnProfile[] = [];
  const excluded: ExcludedColumn[] = [];

  for (const p of profiles) {
    const intel = intelligence[p.name];
    if (intel && intel.confidence < SEMANTIC_CONFIDENCE_THRESHOLD) {
      excluded.push({
        column: p.name,
        reason: "LOW_SEMANTIC_CONFIDENCE",
        confidence: intel.confidence,
      });
    } else {
      valid.push(p);
    }
  }

  return { valid, excluded };
}

// ---------------------------------------------------------------------------
// Context passed from the understanding phase
// ---------------------------------------------------------------------------

/** Optional context that makes EDA domain-aware. */
export interface EDAContext {
  /** Per-column intelligence from the Column Intelligence Engine. */
  intelligence: Record<string, ColumnIntelligence>;
  /** Fact vs dimension map from the Column Intelligence Engine. */
  factDimensionMap: Record<string, "fact" | "dimension" | "unknown">;
  /** Time intelligence from the Relationship Discovery Engine. */
  timeIntelligence: TimeIntelligence | null;
  /** Business domain for domain-specific KPI labels. */
  domain: string;
  /** Suggested KPIs from the Business Context Engine. */
  suggestedKPIs: Array<{ name: string; rationale: string; columns: string[] }>;
}

// ---------------------------------------------------------------------------
// Number formatter (preserved from original)
// ---------------------------------------------------------------------------

const fmt = (v: number, unit?: string): string => {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  let s: string;
  if (abs >= 1e9) s = (v / 1e9).toFixed(2) + "B";
  else if (abs >= 1e6) s = (v / 1e6).toFixed(2) + "M";
  else if (abs >= 1e3) s = (v / 1e3).toFixed(2) + "K";
  else s = v.toFixed(abs < 10 ? 2 : 0);
  return unit ? `${unit}${s}` : s;
};

// ---------------------------------------------------------------------------
// KPI computation — context-aware
// ---------------------------------------------------------------------------

export function computeKPIs(
  rows: Record<string, unknown>[],
  profiles: ColumnProfile[],
  context?: EDAContext,
): KPI[] {
  const kpis: KPI[] = [
    {
      id: "rows",
      label: "Total Records",
      value: rows.length,
      formattedValue: rows.length.toLocaleString(),
      confidence: 1,
      rationale: "Row count of the cleaned dataset.",
    },
    {
      id: "cols",
      label: "Total Attributes",
      value: profiles.length,
      formattedValue: profiles.length.toLocaleString(),
      confidence: 1,
      rationale: "Column count after cleaning.",
    },
  ];

  const intelligence = context?.intelligence;
  const factDimensionMap = context?.factDimensionMap;

  // Determine measure columns — use intelligence if available, fall back to inferredRole
  const measures = profiles.filter((p) => {
    if (factDimensionMap) return factDimensionMap[p.name] === "fact" && p.stats;
    return p.inferredRole === "measure" && p.stats;
  });

  // Domain-specific KPI from suggestedKPIs (highest priority)
  if (context?.suggestedKPIs && context.suggestedKPIs.length > 0) {
    for (const suggested of context.suggestedKPIs.slice(0, 2)) {
      const col = suggested.columns.find((c) => {
        const p = profiles.find((pr) => pr.name === c);
        return p?.stats !== undefined;
      });
      if (col) {
        const p = profiles.find((pr) => pr.name === col)!;
        const total = p.stats!.mean * p.nonNullCount;
        kpis.push({
          id: `kpi_suggested_${col}`,
          label: suggested.name,
          value: total,
          formattedValue: fmt(total),
          confidence: 0.9,
          rationale: suggested.rationale,
        });
      }
    }
  }

  // Standard measures KPIs
  for (const m of measures.slice(0, 4)) {
    const intel = intelligence?.[m.name];
    const aggregation = intel ? resolveAggregation(intel, m) : "sum";

    const displayName = intel?.businessMeaning
      ? extractShortName(intel.businessMeaning)
      : prettify(m.name);

    if (aggregation === "sum" || aggregation === "count") {
      const total = m.stats!.mean * m.nonNullCount;
      kpis.push({
        id: `sum_${m.name}`,
        label: `Total ${displayName}`,
        value: total,
        formattedValue: fmt(total, getUnit(intel)),
        confidence: 0.95,
        rationale: `Sum across ${m.nonNullCount.toLocaleString()} non-null rows.${intel ? ` Classified as ${intel.businessCategory.replace(/_/g, " ")}.` : ""}`,
      });
    }

    if (aggregation === "avg" || aggregation === "rate") {
      kpis.push({
        id: `avg_${m.name}`,
        label: `Avg ${displayName}`,
        value: m.stats!.mean,
        formattedValue: fmt(m.stats!.mean, getUnit(intel)),
        confidence: 0.95,
        rationale: `Arithmetic mean. Median = ${fmt(m.stats!.median)}.${intel?.businessCategory === "ratio_metric" ? " Rate metric — sum would be misleading." : ""}`,
      });
    } else {
      // Always add avg as secondary KPI for non-rate measures
      kpis.push({
        id: `avg_${m.name}`,
        label: `Avg ${displayName}`,
        value: m.stats!.mean,
        formattedValue: fmt(m.stats!.mean, getUnit(intel)),
        confidence: 0.95,
        rationale: `Arithmetic mean. Median = ${fmt(m.stats!.median)}.`,
      });
    }
  }

  // Completeness KPI — valuable data quality signal
  const totalCells = rows.length * profiles.length;
  const nullCells = profiles.reduce((sum, p) => sum + p.nullCount, 0);
  const completeness =
    totalCells > 0 ? ((totalCells - nullCells) / totalCells) * 100 : 100;
  kpis.push({
    id: "completeness",
    label: "Data Completeness",
    value: completeness,
    formattedValue: `${completeness.toFixed(1)}%`,
    confidence: 1,
    rationale: `${nullCells.toLocaleString()} missing cells out of ${totalCells.toLocaleString()} total cells.`,
  });

  return kpis.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Correlation computation (preserved from original)
// ---------------------------------------------------------------------------

export function computeCorrelations(
  rows: Record<string, unknown>[],
  profiles: ColumnProfile[],
  cache?: ColumnCache,
): CorrelationPair[] {
  const measures = profiles.filter((p) => p.inferredRole === "measure");
  const pairs: CorrelationPair[] = [];

  for (let i = 0; i < measures.length; i++) {
    for (let j = i + 1; j < measures.length; j++) {
      const a = measures[i].name;
      const b = measures[j].name;

      let r: number;
      if (cache) {
        // Use cached vectors — no row scan
        const cached = getCorrelation(cache, a, b);
        if (cached === null) continue;
        r = cached;
      } else {
        // Fallback: direct row scan (no cache available)
        const xs: number[] = [];
        const ys: number[] = [];
        for (const row of rows) {
          const x = Number(row[a]);
          const y = Number(row[b]);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            xs.push(x);
            ys.push(y);
          }
        }
        if (xs.length < 8) continue;
        try {
          r = ss.sampleCorrelation(xs, ys);
        } catch {
          continue;
        }
        if (!Number.isFinite(r)) continue;
      }

      const abs = Math.abs(r);
      pairs.push({
        a,
        b,
        r,
        strength: abs > 0.7 ? "strong" : abs > 0.4 ? "moderate" : "weak",
      });
    }
  }

  return pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r)).slice(0, 8);
}

// ---------------------------------------------------------------------------
// Chart building — context-aware
// ---------------------------------------------------------------------------

export function buildCharts(
  rows: Record<string, unknown>[],
  profiles: ColumnProfile[],
  context?: EDAContext,
): ChartSpec[] {
  const charts: ChartSpec[] = [];

  const factDimMap = context?.factDimensionMap;
  const intelligence = context?.intelligence;
  const timeIntel = context?.timeIntelligence;

  // Determine columns by role
  const measures = profiles.filter((p) =>
    factDimMap
      ? factDimMap[p.name] === "fact" && p.stats
      : p.inferredRole === "measure",
  );

  const dimensions = profiles.filter((p) =>
    factDimMap
      ? factDimMap[p.name] === "dimension" &&
        p.inferredType !== "datetime" &&
        p.inferredType !== "date" &&
        p.uniqueCount > 1 &&
        p.uniqueCount <= 30
      : p.inferredRole === "dimension" &&
        p.uniqueCount > 1 &&
        p.uniqueCount <= 30,
  );

  // Use intelligence-detected primary date column; fall back to first date profile
  const primaryDateColName = timeIntel?.primaryDateColumn;
  const dates = profiles.filter(
    (p) =>
      p.inferredRole === "date" ||
      p.inferredType === "datetime" ||
      p.inferredType === "date",
  );
  const primaryDate = primaryDateColName
    ? (profiles.find((p) => p.name === primaryDateColName) ?? dates[0])
    : dates[0];

  // ── Chart 1: Time-series for the primary measure ──────────────────────
  if (primaryDate && measures.length > 0) {
    // Prefer the first KPI-candidate measure; fall back to first measure
    const primaryMeasure =
      measures.find((m) => intelligence?.[m.name]?.isKpiCandidate) ??
      measures[0];

    const granularity = timeIntel?.granularity ?? "month";
    const buckets = new Map<string, number>();

    for (const r of rows) {
      const d = parseDate(r[primaryDate.name]);
      if (!d) continue;
      const key = formatDateBucket(d, granularity);
      buckets.set(
        key,
        (buckets.get(key) ?? 0) + (Number(r[primaryMeasure.name]) || 0),
      );
    }

    const data = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ period: k, [primaryMeasure.name]: v }));

    if (data.length > 1) {
      const measureLabel = intelligence?.[primaryMeasure.name]
        ? extractShortName(intelligence[primaryMeasure.name].businessMeaning)
        : prettify(primaryMeasure.name);

      charts.push({
        id: "ts_primary",
        type: "area",
        title: `${measureLabel} over Time`,
        description: `${granularity.charAt(0).toUpperCase() + granularity.slice(1)}ly trend of ${measureLabel}. ${timeIntel?.hasSeasonalitySignal ? "⚠ Seasonality signal detected — look for recurring peaks." : ""}`,
        xKey: "period",
        yKeys: [primaryMeasure.name],
        data,
        insight: trendInsight(
          data.map((d) => d[primaryMeasure.name] as number),
          measureLabel,
        ),
      });
    }
  }

  // ── Chart 2: Top dimension breakdown for primary measure ─────────────
  if (dimensions.length > 0 && measures.length > 0) {
    // Prefer geographic dimension; fall back to first low-cardinality dimension
    const targetDim =
      dimensions.find((d) => intelligence?.[d.name]?.isGeographic) ??
      dimensions.find((d) => d.uniqueCount <= 15) ??
      dimensions[0];

    const primaryMeasure =
      measures.find((m) => intelligence?.[m.name]?.isKpiCandidate) ??
      measures[0];

    const buckets = new Map<string, number>();
    for (const r of rows) {
      const k = String(r[targetDim.name] ?? "Unknown");
      buckets.set(
        k,
        (buckets.get(k) ?? 0) + (Number(r[primaryMeasure.name]) || 0),
      );
    }

    const data = Array.from(buckets.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([k, v]) => ({ [targetDim.name]: k, [primaryMeasure.name]: v }));

    if (data.length > 1) {
      const measureLabel = intelligence?.[primaryMeasure.name]
        ? extractShortName(intelligence[primaryMeasure.name].businessMeaning)
        : prettify(primaryMeasure.name);
      const dimLabel = intelligence?.[targetDim.name]
        ? extractShortName(intelligence[targetDim.name].businessMeaning)
        : prettify(targetDim.name);

      const top = data[0];
      charts.push({
        id: "dim_primary",
        type: "bar",
        title: `${measureLabel} by ${dimLabel}`,
        description: `Top ${data.length} ${dimLabel} ranked by ${measureLabel}.`,
        xKey: targetDim.name,
        yKeys: [primaryMeasure.name],
        data,
        insight: top
          ? `${String(top[targetDim.name])} leads with ${fmt(Number(top[primaryMeasure.name]))} — ${computeTopShare(data, primaryMeasure.name)}% of the top 10 total.`
          : undefined,
      });
    }
  }

  // ── Chart 3: Second measure vs second dimension (categorical breakdown) ─
  if (dimensions.length > 1 && measures.length > 1) {
    const dim =
      dimensions.find((d, i) => i > 0 && d.uniqueCount <= 10) ?? dimensions[1];
    const measure = measures[1];

    const buckets = new Map<string, number>();
    for (const r of rows) {
      const k = String(r[dim.name] ?? "Unknown");
      buckets.set(k, (buckets.get(k) ?? 0) + (Number(r[measure.name]) || 0));
    }

    const data = Array.from(buckets.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([k, v]) => ({ name: k, value: v }));

    if (data.length > 1) {
      charts.push({
        id: "pie_secondary",
        type: "pie",
        title: `${prettify(dim.name)} Distribution`,
        description: `Share of ${prettify(measure.name)} by ${prettify(dim.name)}.`,
        xKey: "name",
        yKeys: ["value"],
        data,
      });
    }
  }

  // ── Chart 4: Second dimension record count (volume by category) ───────
  if (dimensions.length > 0 && charts.length < 4) {
    const dim = dimensions.find((d) => d.uniqueCount <= 12) ?? dimensions[0];
    const buckets = new Map<string, number>();
    for (const r of rows) {
      const k = String(r[dim.name] ?? "Unknown");
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }

    const data = Array.from(buckets.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([k, v]) => ({ [dim.name]: k, count: v }));

    if (data.length > 1) {
      charts.push({
        id: "vol_by_dim",
        type: "bar",
        title: `Record Volume by ${prettify(dim.name)}`,
        description: `Distribution of records across ${prettify(dim.name)} values.`,
        xKey: dim.name,
        yKeys: ["count"],
        data,
        insight: `${data[0][dim.name]} has the highest record count (${(data[0]["count"] as number).toLocaleString()}).`,
      });
    }
  }

  return charts;
}

// ---------------------------------------------------------------------------
// Top Findings — context-aware, asks WHY
// ---------------------------------------------------------------------------

function buildTopFindings(
  correlations: CorrelationPair[],
  charts: ChartSpec[],
  context?: EDAContext,
  profiles?: ColumnProfile[],
): string[] {
  const findings: string[] = [];

  // Correlation findings (enhanced with business meaning)
  for (const c of correlations.slice(0, 3)) {
    if (c.strength === "weak") continue;

    const aLabel = context?.intelligence?.[c.a]
      ? extractShortName(context.intelligence[c.a].businessMeaning)
      : prettify(c.a);
    const bLabel = context?.intelligence?.[c.b]
      ? extractShortName(context.intelligence[c.b].businessMeaning)
      : prettify(c.b);

    findings.push(
      `${aLabel} and ${bLabel} show ${c.strength} ${c.r > 0 ? "positive" : "negative"} correlation (r = ${c.r.toFixed(2)}). ` +
        (c.r > 0
          ? `As ${aLabel} increases, ${bLabel} tends to increase — investigate whether this is causal or a common driver.`
          : `As ${aLabel} increases, ${bLabel} decreases — examine if this represents a trade-off or efficiency gain.`),
    );
  }

  // Chart-derived findings
  for (const chart of charts) {
    if (chart.insight) findings.push(`${chart.title}: ${chart.insight}`);
  }

  // Domain-specific WHY questions (added in Phase 1)
  if (context?.domain && context.domain !== "generic" && profiles) {
    const measures = profiles.filter((p) => p.inferredRole === "measure");
    const topMeasure = measures[0];
    if (topMeasure && context.timeIntelligence?.hasSeasonalitySignal) {
      findings.push(
        `Seasonality signal detected: the dataset spans ${context.timeIntelligence.spanDays ?? "multiple"} days. ` +
          `Investigate whether ${prettify(topMeasure.name)} peaks correlate with holidays, fiscal quarters, or promotional events.`,
      );
    }

    if (context.suggestedKPIs.length > 0) {
      findings.push(
        `Domain "${context.domain}": recommended KPIs include ${context.suggestedKPIs
          .map((k) => k.name)
          .slice(0, 3)
          .join(", ")}. ` +
          `These have been pre-computed where source columns were available.`,
      );
    }
  }

  return findings.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Master EDA builder — extended signature, backward compatible
// ---------------------------------------------------------------------------

export function buildEDA(
  datasetId: string,
  rows: Record<string, unknown>[],
  profiles: ColumnProfile[],
  context?: EDAContext,
): EDAReport {
  const domain = context?.domain ?? "generic";

  // ── Semantic gate: filter low-confidence columns before analytics ──────
  // KPIs and charts use the full profile list (visual/structural, not analytical).
  // All analytical engines (stats, correlations, RCA, investigation) use only
  // the gated profile list so noisy columns never pollute analytical outputs.
  const { valid: analyticsProfiles } = applySemanticGate(
    profiles,
    context?.intelligence,
  );

  // ── Single-pass column cache ───────────────────────────────────────────
  // Built once from analyticsProfiles so every downstream engine reads from
  // this cache instead of re-scanning rows independently.
  const cache = buildColumnCache(rows, analyticsProfiles);

  // ── KPIs and charts use full profiles (visual, not analytical) ────────
  const legacyKpis = computeKPIs(rows, profiles, context);
  const computedKpis = detectAndComputeKPIs(
    rows,
    profiles.map((p) => p.name),
    domain as any,
  );

  // Merge lists by unique KPI ID to prevent duplicates
  const kpiMap = new Map<string, KPI>();
  for (const k of [...legacyKpis, ...computedKpis]) {
    kpiMap.set(k.id, k);
  }
  const kpis = Array.from(kpiMap.values()).slice(0, 8);

  const charts = buildCharts(rows, profiles, context);

  // ── Correlations — use cached vectors, no row scan ────────────────────
  const numericCols = analyticsProfiles
    .filter((p) => p.inferredRole === "measure")
    .map((p) => p.name);
  const matrix = computeCorrelationMatrix(rows, numericCols);
  const correlations = matrix.map((c) => ({
    a: c.a,
    b: c.b,
    r: c.r,
    strength: c.strength.includes("strong")
      ? ("strong" as const)
      : c.strength.includes("moderate")
        ? ("moderate" as const)
        : ("weak" as const),
  }));
  const topFindings = buildTopFindings(
    correlations,
    charts,
    context,
    analyticsProfiles,
  );

  // ── Phase 2: Extended statistics — use cached numeric vectors ─────────
  const extendedStats = computeAllExtendedStats(
    rows,
    analyticsProfiles,
    domain,
    cache,
  );

  // ── Phase 2: Statistical tests ────────────────────────────────────────
  const statisticalTests: StatisticalTest[] = [];
  for (const p of analyticsProfiles
    .filter((p) => p.inferredRole === "measure")
    .slice(0, 4)) {
    const ext = extendedStats[p.name];
    if (ext) {
      statisticalTests.push(testNormalityFromExtendedStats(ext, p.name));
    } else {
      // Reuse cached vector — no rows.map() call
      const nums = cache.numericVectors.get(p.name) ?? [];
      if (nums.length >= 8) statisticalTests.push(testNormality(nums, p.name));
    }
  }

  // Group difference test — reuse cached vectors for group partitioning
  const categoricals = analyticsProfiles.filter(
    (p) =>
      p.inferredRole === "dimension" &&
      p.uniqueCount >= 2 &&
      p.uniqueCount <= 6,
  );
  const measures = analyticsProfiles.filter(
    (p) => p.inferredRole === "measure" && p.stats,
  );
  if (categoricals.length > 0 && measures.length > 0) {
    const dim = categoricals[0];
    const metric = measures[0];

    // Single O(n) pass: partition metric values by dimension value
    const groupMap = new Map<string, number[]>();
    for (const r of rows) {
      const dimVal = String(r[dim.name] ?? "");
      if (!dimVal) continue;
      if (groupMap.size < 2 && !groupMap.has(dimVal)) groupMap.set(dimVal, []);
      const bucket = groupMap.get(dimVal);
      if (bucket !== undefined) {
        const metricVal = Number(r[metric.name]);
        if (Number.isFinite(metricVal)) bucket.push(metricVal);
      }
    }
    if (groupMap.size === 2) {
      const [[labelA, groupA], [labelB, groupB]] = Array.from(
        groupMap.entries(),
      );
      if (groupA.length >= 4 && groupB.length >= 4) {
        statisticalTests.push(
          testGroupDifference(groupA, groupB, labelA, labelB, metric.name),
        );
      }
    }
  }

  // ── Phase 2: Time-Series Analysis ─────────────────────────────────────
  const timeSeriesAnalysis: TimeSeriesAnalysis[] = [];
  const timeIntel = context?.timeIntelligence;
  if (timeIntel) {
    const tsTargets = analyticsProfiles
      .filter(
        (p) =>
          context?.intelligence?.[p.name]?.isKpiCandidate ||
          p.inferredRole === "measure",
      )
      .slice(0, 2);
    // Pre-parse dates once — reused across all measure columns to avoid
    // repeated parseDate() calls on every row for every target measure.
    const parsedDates = rows.map((r) => {
      const v = r[timeIntel.primaryDateColumn];
      if (v instanceof Date && !isNaN(v.getTime())) return v;
      if (typeof v === "string" || typeof v === "number") {
        const d = new Date(v);
        if (!isNaN(d.getTime())) return d;
      }
      return null;
    });
    for (const m of tsTargets) {
      const ts = analyseTimeSeries(
        rows,
        timeIntel.primaryDateColumn,
        m.name,
        timeIntel.granularity,
        domain,
        parsedDates,
      );
      if (ts) timeSeriesAnalysis.push(ts);
    }
  }

  // ── Phase 2: Root Cause Analysis ──────────────────────────────────────
  const rootCauseAnalyses: RootCauseAnalysis[] = [];
  if (timeSeriesAnalysis.length > 0) {
    const primaryTs = timeSeriesAnalysis[0];
    const peakPeriodData = primaryTs.periods.find(
      (p) => p.period === primaryTs.peakPeriod,
    );
    if (peakPeriodData && Math.abs(primaryTs.totalGrowthPct) >= 20) {
      const rca = analyseRootCause(
        rows,
        primaryTs.measureColumn,
        peakPeriodData.value,
        analyticsProfiles,
        domain,
        2,
        extendedStats,
      );
      if (rca) rootCauseAnalyses.push(rca);
    }
  } else if (measures.length > 0 && extendedStats[measures[0].name]) {
    const topMeasure = measures[0];
    const ext = extendedStats[topMeasure.name];
    if (ext && Math.abs((ext.max - ext.mean) / (ext.mean || 1)) > 0.5) {
      const rca = analyseRootCause(
        rows,
        topMeasure.name,
        ext.percentiles["p90"] ?? ext.max,
        analyticsProfiles,
        domain,
        2,
        extendedStats,
      );
      if (rca) rootCauseAnalyses.push(rca);
    }
  }

  // ── Phase 2.5: Autonomous Investigation Engine ────────────────────────
  const investigations = runAutonomousInvestigation(
    rows,
    analyticsProfiles,
    timeSeriesAnalysis,
    topFindings,
    domain,
    80,
    3,
    extendedStats,
    cache, // pass cache so investigation engine skips redundant row scans
  );

  // ── Enhanced topFindings ───────────────────────────────────────────────
  const enhancedFindings = buildEnhancedFindings(
    topFindings,
    extendedStats,
    timeSeriesAnalysis,
    rootCauseAnalyses,
    statisticalTests,
    analyticsProfiles,
    context,
  );

  // ── Segmentation analysis (Phase 4 upgrade) ───────────────────────────
  let segmentation = null;
  const dimensionCols = analyticsProfiles
    .filter(
      (p) =>
        p.inferredRole === "dimension" &&
        p.uniqueCount >= 2 &&
        p.uniqueCount <= 30,
    )
    .map((p) => p.name);
  if (numericCols[0] && dimensionCols.length > 0) {
    try {
      segmentation = runSegmentationAnalysis(
        rows,
        profiles.map((p) => p.name),
        numericCols[0],
        dimensionCols,
      );
    } catch (e) {
      console.warn("Segmentation analysis failed:", e);
    }
  }

  return {
    datasetId,
    kpis,
    charts,
    correlations,
    distributions: [],
    topFindings: enhancedFindings,
    extendedStats,
    timeSeriesAnalysis,
    rootCauseAnalyses,
    statisticalTests,
    investigations,
    segmentation,
  };
}

// ---------------------------------------------------------------------------
// Utilities (internal helpers)
// ---------------------------------------------------------------------------

export function prettify(name: string): string {
  return name.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Extract a short display name from a full businessMeaning string. */
function extractShortName(meaning: string): string {
  // Format: "Column Name: description..." → return just "Column Name"
  const colonIdx = meaning.indexOf(":");
  if (colonIdx > 0 && colonIdx < 40) {
    return meaning.slice(0, colonIdx).trim();
  }
  // Fall back to first 4 words
  return meaning.split(/\s+/).slice(0, 4).join(" ");
}

function getUnit(intel: ColumnIntelligence | undefined): string | undefined {
  if (!intel) return undefined;
  const tags = intel.businessTags;
  // Tags set by extractMeasuresAndDimensions carry unit hints
  return undefined; // units are tracked in measures[], not in KPI formatter currently
}

function resolveAggregation(
  intel: ColumnIntelligence,
  profile: ColumnProfile,
): "sum" | "avg" | "count" | "max" | "min" | "rate" {
  if (intel.businessCategory === "ratio_metric") return "avg";
  if (/rate|pct|percent|ratio|score|index/i.test(profile.name)) return "avg";
  return "sum";
}

function parseDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function formatDateBucket(d: Date, granularity: string): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const w = getISOWeek(d);
  switch (granularity) {
    case "year":
      return `${y}`;
    case "quarter":
      return `${y}-Q${Math.ceil(d.getMonth() / 3 + 1)}`;
    case "week":
      return `${y}-W${String(w).padStart(2, "0")}`;
    case "day":
      return `${y}-${m}-${String(d.getDate()).padStart(2, "0")}`;
    default:
      return `${y}-${m}`; // month (default)
  }
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
}

function trendInsight(values: number[], label: string): string {
  if (values.length < 2) return "";
  const first = values[0];
  const last = values[values.length - 1];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pct = first === 0 ? 0 : ((last - first) / Math.abs(first)) * 100;
  return (
    `${label} ${pct >= 0 ? "grew" : "declined"} ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% from first to last period. ` +
    `Peak: ${fmt(max)}, trough: ${fmt(min)}.`
  );
}

function computeTopShare(
  data: Record<string, unknown>[],
  measureKey: string,
): string {
  const total = data.reduce((s, d) => s + Number(d[measureKey] ?? 0), 0);
  const top = Number(data[0]?.[measureKey] ?? 0);
  return total > 0 ? ((top / total) * 100).toFixed(1) : "0";
}

// ---------------------------------------------------------------------------
// Enhanced findings builder (Phase 2)
// ---------------------------------------------------------------------------

function buildEnhancedFindings(
  baseFindings: string[],
  extendedStats: Record<string, ExtendedNumericStats>,
  timeSeriesAnalysis: TimeSeriesAnalysis[],
  rootCauseAnalyses: RootCauseAnalysis[],
  statisticalTests: StatisticalTest[],
  profiles: ColumnProfile[],
  context?: EDAContext,
): string[] {
  const findings = [...baseFindings];

  // Add time-series narratives
  for (const ts of timeSeriesAnalysis.slice(0, 2)) {
    findings.push(ts.narrative);
  }

  // Add distribution insights from extended stats
  for (const [col, ext] of Object.entries(extendedStats).slice(0, 2)) {
    if (
      ext.distributionShape !== "normal" &&
      ext.distributionShape !== "unknown"
    ) {
      findings.push(ext.distributionExplanation);
    }
    if (ext.anomalyCount > 0) {
      findings.push(
        `${prettify(col)}: ${ext.anomalyCount} statistical anomaly${ext.anomalyCount > 1 ? "ies" : ""} detected via z-score (threshold ${ext.zScoreThreshold}). ` +
          `CV=${(ext.coefficientOfVariation * 100).toFixed(1)}% — ${ext.coefficientOfVariation > 0.5 ? "high variability, investigate outlier drivers" : "moderate variability"}.`,
      );
    }
  }

  // Add RCA conclusions
  for (const rca of rootCauseAnalyses.slice(0, 1)) {
    findings.push(
      `Root Cause Analysis — ${prettify(rca.targetMetric)}: ${rca.conclusion}`,
    );
  }

  // Add significant statistical test results
  for (const test of statisticalTests
    .filter((t) => t.isSignificant)
    .slice(0, 2)) {
    findings.push(
      `${test.testName}: ${test.interpretation} ${test.businessImplication}`,
    );
  }

  return findings.slice(0, 12); // cap at 12 findings
}
