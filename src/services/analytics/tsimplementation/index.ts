/**
 * InsightForge AI — TypeScript Analytics Service Implementation
 * -------------------------------------------------------------
 * Phase 1 upgrade: Business Intelligence Foundation wired in.
 *
 * What changed:
 *  - understandDataset() now runs the full profileDataset() enrichment FIRST,
 *    then passes the intelligence to the AI — so AI validates heuristics,
 *    not the other way around.
 *  - proposeCleaning() passes column intelligence to detectIssues() for
 *    domain-aware null/outlier reasoning.
 *  - runEDA() accepts and passes EDAContext built from the understanding output.
 *  - runAnalytics() passes measures, dimensions, time, and process context to
 *    Gemini so insights are domain-specific, not generic.
 *  - analyzeAll() caches the understanding output and threads it through
 *    every downstream stage (no repeated profile computations).
 *
 * Public API: AnalyticsService interface — unchanged.
 */

import type {
  AnalystNotes,
  AnalyticsReport,
  AnalyticsService,
  CleaningReport,
  DatasetUnderstanding,
  EDAReport,
  FullAnalysis,
  ParsedDataset,
  ReasoningStep,
  AIInsight,
  ColumnProfile,
} from "../types";

// Internal extension of the public AnalyticsService interface.
// runAnalytics accepts an optional pre-computed EDAReport so that
// analyzeAll() can pass the result it already has instead of triggering
// a second buildEDA() call. External callers that omit the third argument
// get the original behaviour — buildEDA() runs inside runAnalytics().
type RunAnalyticsInternal = (
  datasetId: string,
  notes?: AnalystNotes,
  precomputedEda?: EDAReport,
) => Promise<AnalyticsReport>;
import {
  applyIssues,
  buildReport,
  detectIssues,
  enforceDAIEGovernance,
} from "./cleaner";
import { buildEDA, type EDAContext } from "./eda";
import {
  profileAll,
  profileDataset,
  type EnrichedProfileResult,
} from "./profiler";

import { parseFile, type InternalDataset } from "./parser";
import {
  generateUnderstanding,
  reasonAnalytics,
  reasonCleaningIssues,
} from "@/lib/ai-reasoning.functions";

import { detectAndComputeKPIs } from "./analytics/kpiEngine";
import { computeCorrelationMatrix } from "./analytics/correlationEngine";
import { detectAnomalies } from "./analytics/anomalyEngine";
import { runSegmentationAnalysis } from "./analytics/segmentation";
import { generateAdvancedForecast, type ExtendedForecastResult } from "./analytics/forecastingEngine";
import { generateRecommendations } from "./analytics/recommendationEngine";
import { calculateDataQuality } from "./analytics/qualityScore";
import { generateStructuredInsights } from "./analytics/insightEngine";
import { generateSCQANarrative, compileSCQANarrativeText } from "./analytics/narrativeEngine";

// ---------------------------------------------------------------------------
// In-process session store
// ---------------------------------------------------------------------------

/**
 * Stores both the raw dataset and the enriched profiling result per session.
 * The enriched result is computed once in understandDataset() and reused
 * by cleaning, EDA, and analytics — avoiding redundant computation.
 */
interface SessionEntry {
  dataset: InternalDataset;
  enriched?: EnrichedProfileResult;
}

const store = new Map<string, SessionEntry>();

function getSession(datasetId: string): SessionEntry {
  const entry = store.get(datasetId);
  if (!entry) throw new Error(`Dataset ${datasetId} not found in session.`);
  return entry;
}

// ---------------------------------------------------------------------------
// AnalyticsService implementation
// ---------------------------------------------------------------------------

export const tsAnalyticsService: AnalyticsService = {
  // ── parseFile ────────────────────────────────────────────────────────────
  async parseFile(file) {
    const ds = await parseFile(file);
    store.set(ds.datasetId, { dataset: ds });
    const { rows: _omit, ...publicDs } = ds;
    return publicDs as ParsedDataset;
  },

  // ── understandDataset ────────────────────────────────────────────────────
  async understandDataset(datasetId, notes) {
    const session = getSession(datasetId);
    const ds = session.dataset;

    // ── Step 1: Reuse the cached enriched profiling pass when analyzeAll()
    // already computed it; direct callers still profile on demand.
    const enriched = session.enriched ?? profileDataset(ds.rows, ds.columns);

    // Cache the enriched result for downstream stages
    session.enriched = enriched;

    // ── Step 2: Reuse business context already computed by profileDataset() ──
    const businessProcesses = enriched.businessProcesses;
    const primaryEntities = enriched.primaryEntities;
    const suggestedKPIs = enriched.suggestedKPIs;

    // ── Step 3: Call AI with enriched heuristic context ────────────────
    let aiOut: Awaited<ReturnType<typeof generateUnderstanding>> | null = null;
    try {
      aiOut = await generateUnderstanding({
        data: {
          fileName: ds.fileName,
          columns: ds.columns,
          sampleRows: ds.rows.slice(0, 15),
          rowCount: ds.rowCount,
          notes: notes?.text,
          // Phase 1 enrichment passed to AI for validation
          heuristicDomain: enriched.domain.value,
          heuristicConfidence: enriched.domain.confidence,
          domainRationale: enriched.domain.rationale,
          processName: enriched.domain.processName,
          kpiHints: enriched.domain.kpiHints,
          columnIntelligenceSummary: Object.entries(enriched.intelligence).map(
            ([col, intel]) => ({
              column: col,
              businessCategory: intel.businessCategory,
              schemaRole: intel.schemaRole,
              businessTags: intel.businessTags,
              isKpiCandidate: intel.isKpiCandidate,
              isForecastCandidate: intel.isForecastCandidate,
              confidence: intel.confidence,
            }),
          ),
          detectedRelationships: enriched.relationships
            .slice(0, 12)
            .map((r) => ({
              from: r.fromColumn,
              to: r.toColumn,
              type: r.relationshipType,
              confidence: r.confidence,
              rationale: r.rationale,
            })),
          timeIntelligence: enriched.timeIntelligence ?? undefined,
        },
      });
    } catch (e) {
      console.warn(
        "AI understanding failed, using enriched heuristics only:",
        e,
      );
    }

    // ── Step 4: Merge AI output with heuristic intelligence ───────────
    // AI meaning overrides heuristic meaning; heuristic fills gaps.
    const meaningByCol = new Map(
      (aiOut?.columnMeanings ?? []).map((m) => [m.column, m]),
    );

    for (const p of enriched.profiles) {
      const aiMeaning = meaningByCol.get(p.name);
      if (aiMeaning) {
        // AI meaning is more specific — override the heuristic
        p.businessMeaning = aiMeaning.meaning;
        p.inferredRole = aiMeaning.role;
        if (p.intelligence) {
          p.intelligence.businessMeaning = aiMeaning.meaning;
        }
      }
      // If no AI meaning, keep the heuristic businessMeaning already set in profileDataset()
    }

    // ── Step 5: Build DatasetUnderstanding (fully backward compatible) ─
    const understanding: DatasetUnderstanding = {
      datasetId,
      domain: aiOut?.domain ?? enriched.domain.value,
      domainConfidence: aiOut?.domainConfidence ?? enriched.domain.confidence,
      summary:
        aiOut?.summary ??
        `Dataset "${ds.fileName}" contains ${ds.rowCount.toLocaleString()} rows across ${ds.columnCount} columns. ` +
          `Business domain: ${enriched.domain.value}. Business process: ${enriched.domain.processName}. ` +
          enriched.domain.purposeTemplate,
      purpose: aiOut?.purpose ?? enriched.domain.purposeTemplate,
      primaryEntities: aiOut?.primaryEntities ?? primaryEntities,
      suggestedKPIs: aiOut?.suggestedKPIs ?? suggestedKPIs,
      columnProfiles: enriched.profiles,
      relationships:
        aiOut?.relationships ??
        enriched.relationships.slice(0, 10).map((r) => ({
          from: r.fromColumn,
          to: r.toColumn,
          type: r.relationshipType,
          confidence: r.confidence,
        })),
      warnings: aiOut?.warnings ?? [],

      // Phase 1 additions
      columnIntelligence: enriched.intelligence,
      columnRelationships: enriched.relationships,
      businessProcesses,
      timeIntelligence: enriched.timeIntelligence ?? undefined,
      domainRationale: enriched.domain.rationale,
      factDimensionMap: enriched.factDimensionMap,
      measures: enriched.measures,
      dimensions: enriched.dimensions,
    };

    return understanding;
  },

  // ── proposeCleaning ──────────────────────────────────────────────────────
  async proposeCleaning(datasetId, notes) {
    const session = getSession(datasetId);
    const ds = session.dataset;

    // Use cached enriched profiles if available; otherwise run fresh
    const enriched = session.enriched ?? profileDataset(ds.rows, ds.columns);
    const profiles = enriched.profiles;
    const intelligence = enriched.intelligence;

    // Run Data Quality Intelligence (Phase 1: passes intelligence for domain-aware reasoning)
    const heuristicIssues = detectIssues(ds.rows, profiles, intelligence);

    // Duplicate count for AI context — read from the dup_ issue already produced
    // by detectIssues() above. That issue carries affectedRows which IS the
    // duplicate count, so we avoid a second O(n) JSON.stringify pass.
    const dupCount =
      heuristicIssues.find((i) => i.id.startsWith("dup_"))?.affectedRows ?? 0;

    const numericCols = profiles.filter(p => p.inferredRole === "measure").map(p => p.name);
    const anomalies = detectAnomalies(ds.rows, ds.columns, numericCols, []);
    const quality = calculateDataQuality(ds.rows, profiles, anomalies, dupCount);

    try {
      const ai = await reasonCleaningIssues({
        data: {
          domain: enriched.domain.value,
          processName: enriched.domain.processName,
          rowCount: ds.rowCount,
          duplicateRowCount: dupCount,
          // Pass enriched column context to AI (Phase 1 upgrade)
          columnSummaries: profiles.map((p) => {
            const intel = intelligence[p.name];
            const heuristicIssue = heuristicIssues.find((i) =>
              i.affectedColumns?.includes(p.name),
            );
            return {
              column: p.name,
              inferredType: p.inferredType,
              nullPct: p.nullCount / Math.max(1, ds.rowCount),
              uniquePct: p.uniqueCount / Math.max(1, ds.rowCount),
              sampleValues: p.sampleValues,
              outlierPct: p.stats
                ? p.stats.outlierCount / Math.max(1, ds.rowCount)
                : undefined,
              // Phase 1 enrichment
              businessCategory: intel?.businessCategory,
              schemaRole: intel?.schemaRole,
              isKpiCandidate: intel?.isKpiCandidate,
              possibleCauses: heuristicIssue?.possibleCauses,
            };
          }),
          notes: notes?.text,
        },
      });

      const aiIssues = ai.issues.map((it, i) => ({
        id: `ai_${i}_${it.action}`,
        ...it,
      }));

      // Merge: AI issues first (more specific), heuristic issues fill gaps.
      // Governance filter: AI issues are downgraded to flag_only; only DAIE-backed
      // heuristic issues may carry executable actions.
      const merged = [...aiIssues, ...heuristicIssues].map(
        enforceDAIEGovernance,
      );
      
      const report = buildReport(
        datasetId,
        merged,
        ds.rowCount,
        ds.rowCount,
        ai.overallNotes + "\n\n" + quality.recommendations.join("\n"),
      );
      report.qualityScore = quality.overallScore;
      return report;
    } catch (e) {
      console.warn(
        "AI cleaning reasoning failed; using Data Quality Intelligence issues only.",
        e,
      );
      const report = buildReport(
        datasetId,
        heuristicIssues,
        ds.rowCount,
        ds.rowCount,
        "Heuristic + Data Quality Intelligence cleaning report with deterministic readiness evidence.\n\n" + quality.recommendations.join("\n"),
      );
      report.qualityScore = quality.overallScore;
      return report;
    }
  },

  // ── applyCleaning ────────────────────────────────────────────────────────
  async applyCleaning(datasetId, issueIds) {
    const session = getSession(datasetId);
    const ds = session.dataset;
    const enriched = session.enriched ?? profileDataset(ds.rows, ds.columns);
    const profiles = profileAll(ds.rows, ds.columns);
    const all = detectIssues(ds.rows, profiles, enriched.intelligence);
    const hasDupId = issueIds.some((id) => id.startsWith("dup_"));
    const toApply = all.filter(
      (i) =>
        issueIds.includes(i.id) || (hasDupId && i.action === "drop_duplicates"),
    );
    const { rows } = applyIssues(ds.rows, toApply);
    const before = ds.rowCount;
    ds.rows = rows;
    ds.rowCount = rows.length;
    ds.preview = rows.slice(0, 1000);
    // Invalidate cached enriched result so next call re-profiles cleaned data
    session.enriched = undefined;
    return buildReport(
      datasetId,
      toApply.map((i) => ({ ...i, applied: true })),
      before,
      rows.length,
      "Cleaning applied.",
    );
  },

  // ── runEDA ───────────────────────────────────────────────────────────────
  async runEDA(datasetId) {
    const session = getSession(datasetId);
    const ds = session.dataset;

    // Use cached enriched result to avoid re-profiling
    const enriched = session.enriched ?? profileDataset(ds.rows, ds.columns);

    // Build EDA context from Phase 1 intelligence
    const edaContext: EDAContext = {
      intelligence: enriched.intelligence,
      factDimensionMap: enriched.factDimensionMap,
      timeIntelligence: enriched.timeIntelligence,
      domain: enriched.domain.value,
      suggestedKPIs: enriched.suggestedKPIs,
    };

    return buildEDA(datasetId, ds.rows, enriched.profiles, edaContext);
  },

  // ── runAnalytics ─────────────────────────────────────────────────────────
  // The public signature matches AnalyticsService (datasetId, notes?).
  // Internally cast to RunAnalyticsInternal to accept an optional third
  // argument from analyzeAll() — no interface change for external callers.
  async runAnalytics(datasetId, notes, ...rest) {
    const precomputedEda: EDAReport | undefined = (rest as [EDAReport?])[0];
    const session = getSession(datasetId);
    const ds = session.dataset;

    const enriched = session.enriched ?? profileDataset(ds.rows, ds.columns);

    // Use the pre-computed EDA report when provided (e.g. from analyzeAll).
    // Otherwise build it now so direct callers of runAnalytics() still work.
    let eda: EDAReport;
    if (precomputedEda) {
      eda = precomputedEda;
    } else {
      const edaContext: EDAContext = {
        intelligence: enriched.intelligence,
        factDimensionMap: enriched.factDimensionMap,
        timeIntelligence: enriched.timeIntelligence,
        domain: enriched.domain.value,
        suggestedKPIs: enriched.suggestedKPIs,
      };
      eda = buildEDA(datasetId, ds.rows, enriched.profiles, edaContext);
    }

    // Build a rich understanding string for the AI prompt
    const understanding =
      `Domain: ${enriched.domain.value} (${enriched.domain.processName}). ` +
      `${ds.rowCount} rows × ${ds.columnCount} columns. ` +
      `Measures: ${enriched.measures.map((m) => `${m.column} (${m.aggregation})`).join(", ")}. ` +
      `Key dimensions: ${enriched.dimensions
        .slice(0, 4)
        .map((d) => d.column)
        .join(", ")}. ` +
      `${enriched.timeIntelligence ? `Time span: ${enriched.timeIntelligence.spanDays ?? "?"} days, seasonality=${enriched.timeIntelligence.hasSeasonalitySignal}.` : ""}`;

    const suggestedKPIs = enriched.suggestedKPIs;

    try {
      const ai = await reasonAnalytics({
        data: {
          domain: enriched.domain.value,
          understanding,
          kpis: eda.kpis.map((k) => ({
            label: k.label,
            value: k.formattedValue,
          })),
          topFindings: eda.topFindings,
          correlations: eda.correlations.map((c) => ({
            a: c.a,
            b: c.b,
            r: c.r,
          })),
          notes: notes?.text,
          // Phase 1 enrichment
          processName: enriched.domain.processName,
          primaryEntities: enriched.domain.coreEntities,
          measuresContext: enriched.measures.slice(0, 6),
          dimensionsContext: enriched.dimensions.slice(0, 6),
          timeContext: enriched.timeIntelligence
            ? {
                primaryDateColumn: enriched.timeIntelligence.primaryDateColumn,
                granularity: enriched.timeIntelligence.granularity,
                hasSeasonalitySignal:
                  enriched.timeIntelligence.hasSeasonalitySignal,
                spanDays: enriched.timeIntelligence.spanDays,
              }
            : undefined,
          suggestedKPIs: suggestedKPIs.map((k) => ({
            name: k.name,
            rationale: k.rationale,
          })),
          // Phase 2: Advanced Analytical Intelligence
          timeSeriesNarratives: eda.timeSeriesAnalysis?.map(
            (ts) => ts.narrative,
          ),
          // Phase 2.5: Autonomous Investigation Engine results merged into rootCauseSummaries.
          // AnalyticsInput already accepts this field — no schema change needed.
          // Each investigation contributes: its SCQA headline, its conclusion (with rejected
          // hypotheses explicitly named), and its driver importance ranking.
          rootCauseSummaries: [
            // Phase 2 RCA conclusions
            ...(eda.rootCauseAnalyses?.map((rca) => rca.conclusion) ?? []),
            // Phase 2.5 investigation conclusions — each is a full evidence chain summary
            ...(eda.investigations ?? []).map((inv) => {
              const rejectedCount = inv.rejectedHypotheses.length;
              const leadingLabel = inv.leadingHypotheses[0]
                ? `Leading hypothesis: "${inv.leadingHypotheses[0].statement.slice(0, 120)}" (${(inv.leadingHypotheses[0].confidence * 100).toFixed(0)}% confidence, verdict: ${inv.leadingHypotheses[0].verdict}).`
                : "No hypothesis confirmed.";
              const rejectedLabel =
                rejectedCount > 0
                  ? ` Explicitly rejected ${rejectedCount} alternative explanation${rejectedCount > 1 ? "s" : ""}: ${inv.rejectedHypotheses
                      .slice(0, 2)
                      .map(
                        (h) =>
                          `"${h.statement.split(".")[0]}" (${h.rationale})`,
                      )
                      .join("; ")}.`
                  : "";
              const driversLabel =
                inv.driverImportance.length > 0
                  ? ` Top drivers: ${inv.driverImportance
                      .slice(0, 3)
                      .map(
                        (d) => `${d.label} (${d.contributionPct.toFixed(0)}%)`,
                      )
                      .join(", ")}.`
                  : "";
              return (
                `[Autonomous Investigation] ${inv.executiveNarrative.headline} ` +
                `${inv.conclusion} ` +
                leadingLabel +
                rejectedLabel +
                driversLabel
              );
            }),
          ].filter(Boolean),
          distributionInsights: eda.extendedStats
            ? Object.entries(eda.extendedStats)
                .filter(
                  ([, ext]) =>
                    ext.distributionShape !== "normal" || ext.anomalyCount > 0,
                )
                .slice(0, 4)
                .map(([col, ext]) => ({
                  column: col,
                  shape: ext.distributionShape,
                  explanation: ext.distributionExplanation,
                  anomalyCount: ext.anomalyCount,
                  cv: ext.coefficientOfVariation,
                }))
            : undefined,
          statisticalTestResults: eda.statisticalTests?.map((t) => ({
            testName: t.testName,
            isSignificant: t.isSignificant,
            interpretation: t.interpretation,
            businessImplication: t.businessImplication,
          })),
          forecastSummaries: eda.timeSeriesAnalysis
            ?.filter((ts) => ts.forecast)
            .map((ts) => ({
              column: ts.measureColumn,
              method: ts.forecast!.method,
              trend: ts.overallTrend,
              totalGrowthPct: ts.totalGrowthPct,
              confidence: ts.forecast!.confidence,
              nextPeriods: ts.forecast!.nextPeriods.map((p) => ({
                period: p.period,
                predicted: p.predicted,
              })),
            })),
        },
      });

      const wrap =
        (lvl: AIInsight["level"]) =>
        (arr: Array<Omit<AIInsight, "id" | "level">>) =>
          arr.map((x, i) => ({ id: `${lvl}_${i}`, level: lvl, ...x }));

      return {
        datasetId,
        executiveSummary: ai.executiveSummary,
        businessHealthScore: ai.businessHealthScore,
        descriptive: wrap("descriptive")(
          ai.descriptive as Array<Omit<AIInsight, "id" | "level">>,
        ),
        diagnostic: wrap("diagnostic")(
          ai.diagnostic as Array<Omit<AIInsight, "id" | "level">>,
        ),
        predictive: wrap("predictive")(
          ai.predictive as Array<Omit<AIInsight, "id" | "level">>,
        ),
        prescriptive: wrap("prescriptive")(
          ai.prescriptive as Array<Omit<AIInsight, "id" | "level">>,
        ),
      } satisfies AnalyticsReport;
    } catch (e) {
      console.warn(
        "AI analytics enrichment did not complete; returning deterministic readiness assessment:",
        e,
      );
      return buildFallbackAnalytics(
        datasetId,
        eda,
        enriched.domain.value,
        ds.rows,
        ds.columns,
        enriched.profiles,
      );
    }
  },

  // ── analyzeAll ───────────────────────────────────────────────────────────
  async analyzeAll(file, options): Promise<FullAnalysis> {
    const log: ReasoningStep[] = [];
    const step = (
      phase: ReasoningStep["phase"],
      message: string,
      detail?: string,
    ) => {
      const s: ReasoningStep = {
        timestamp: Date.now(),
        phase,
        message,
        detail,
      };
      log.push(s);
      options?.onProgress?.(s);
    };

    // ── Parse ──────────────────────────────────────────────────────────
    step("understanding", "Parsing file");
    const dataset = await this.parseFile(file);
    step(
      "understanding",
      `Parsed ${dataset.rowCount.toLocaleString()} rows × ${dataset.columnCount} columns`,
    );

    // ── Profiling (Phase 1 engines) ────────────────────────────────────
    step(
      "profiling",
      "Running Business Context Engine, Column Intelligence Engine, Relationship Discovery Engine",
    );
    const session = getSession(dataset.datasetId);
    const enriched = profileDataset(
      session.dataset.rows,
      session.dataset.columns,
    );
    session.enriched = enriched;
    step(
      "profiling",
      `Domain: ${enriched.domain.value} (${(enriched.domain.confidence * 100).toFixed(0)}% confidence) · ${enriched.measures.length} measures · ${enriched.dimensions.length} dimensions · ${enriched.relationships.length} relationships detected`,
      enriched.domain.rationale,
    );

    // ── Understanding (AI validates heuristics) ────────────────────────
    step(
      "understanding",
      "Inferring business domain, column semantics, and KPIs",
    );
    const understanding = await this.understandDataset(
      dataset.datasetId,
      options?.notes,
    );
    step(
      "understanding",
      `Domain: ${understanding.domain} (${Math.round(understanding.domainConfidence * 100)}% confidence) · ${understanding.primaryEntities.length} entities · ${understanding.suggestedKPIs.length} KPIs`,
    );

    // ── Cleaning (Data Quality Intelligence) ──────────────────────────
    step("cleaning", "Analysing data quality with business context reasoning");
    const proposedCleaning = await this.proposeCleaning(
      dataset.datasetId,
      options?.notes,
    );
    const cleaning =
      proposedCleaning.issues.length > 0
        ? await this.applyCleaning(
            dataset.datasetId,
            proposedCleaning.issues.map((issue) => issue.id),
          )
        : proposedCleaning;

    // Update the returned dataset metadata to reflect any row changes
    // from applied cleaning so the full analysis remains consistent.
    dataset.rowCount = session.dataset.rowCount;
    dataset.preview = session.dataset.preview;

    step(
      "cleaning",
      `${cleaning.issues.length} quality issues identified · quality score ${cleaning.qualityScore}/100`,
    );

    // ── EDA (context-aware) ────────────────────────────────────────────
    step(
      "eda",
      "Running context-aware EDA with domain KPIs, statistical analysis, time-series intelligence, root cause analysis, and autonomous investigation",
    );
    const eda = await this.runEDA(dataset.datasetId, options?.notes);
    step(
      "eda",
      `${eda.kpis.length} KPIs · ${eda.charts.length} charts · ${eda.correlations.length} correlations · ${eda.timeSeriesAnalysis?.length ?? 0} time-series · ${eda.rootCauseAnalyses?.length ?? 0} RCA · ${eda.statisticalTests?.length ?? 0} stat tests · ${eda.investigations?.length ?? 0} autonomous investigation${(eda.investigations?.length ?? 0) === 1 ? "" : "s"}`,
    );

    // ── Analytics (enriched prompts) ───────────────────────────────────
    step(
      "analytics",
      "Running 4-level analytics (descriptive → diagnostic → predictive → prescriptive) with domain context",
    );
    // Pass the already-computed EDA report so buildEDA() is not called again.
    const analytics = await (this.runAnalytics as RunAnalyticsInternal)(
      dataset.datasetId,
      options?.notes,
      eda,
    );
    step(
      "analytics",
      `Business health score: ${analytics.businessHealthScore}/100`,
    );

    step("reporting", "Analysis complete");
    return {
      dataset,
      understanding,
      cleaning,
      eda,
      analytics,
      reasoningLog: log,
    };
  },
};

// ---------------------------------------------------------------------------
// Deterministic business readiness assessment
// ---------------------------------------------------------------------------

function buildFallbackAnalytics(
  datasetId: string,
  eda: EDAReport,
  domain: string,
  rows: Record<string, unknown>[],
  columns: string[],
  profiles: ColumnProfile[],
): AnalyticsReport {
  const prettify = (name: string) => name.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const numericCols = profiles.filter(p => p.inferredRole === "measure").map(p => p.name);
  
  // 1. Correlation Matrix
  const correlationMatrix = computeCorrelationMatrix(rows, numericCols);
  
  // 2. Anomaly Detection
  const anomalies = detectAnomalies(rows, columns, numericCols, eda.timeSeriesAnalysis || []);
  
  // 3. Recommendation Engine
  const recommendations = generateRecommendations(domain as any, eda.kpis, anomalies, correlationMatrix);
  
  // 4. Time Series Forecasts Extraction
  const forecasts: ExtendedForecastResult[] = [];
  if (eda.timeSeriesAnalysis) {
    for (const ts of eda.timeSeriesAnalysis) {
      if (ts.forecast) {
        forecasts.push({
          ...ts.forecast,
          selectedMethod: ts.forecast.method as any,
          explanation: `Forecasting projection for measure '${prettify(ts.measureColumn)}'.`,
          mape: 1 - ts.forecast.confidence
        });
      }
    }
  }

  // 5. Generate structured insights (Descriptive, Diagnostic, Predictive, Prescriptive)
  const insights = generateStructuredInsights(
    domain as any,
    eda.kpis,
    correlationMatrix,
    anomalies,
    eda.segmentation,
    forecasts,
    recommendations
  );

  // 6. Executive Narrative SCQA
  const scqa = generateSCQANarrative(
    domain as any,
    rows.length,
    eda.kpis,
    anomalies,
    correlationMatrix,
    recommendations
  );
  const scqaText = compileSCQANarrativeText(scqa);

  // 7. Quality Score calculation for business health reference
  const totalCells = rows.length * profiles.length;
  const nullCount = profiles.reduce((sum, p) => sum + p.nullCount, 0);
  const completeness = totalCells > 0 ? (totalCells - nullCount) / totalCells : 1;
  const healthScore = Math.round(completeness * 100);

  return {
    datasetId,
    executiveSummary: scqaText,
    businessHealthScore: healthScore,
    descriptive: insights.descriptive,
    diagnostic: insights.diagnostic,
    predictive: insights.predictive,
    prescriptive: insights.prescriptive
  };
}
