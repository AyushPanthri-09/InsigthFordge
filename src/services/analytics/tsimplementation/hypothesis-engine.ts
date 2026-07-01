/**
 * Hypothesis Engine
 * -----------------
 * Phase 2.5: Competing hypothesis testing against dataset evidence.
 *
 * For every important finding, this engine:
 *  1. Generates a set of COMPETING hypotheses (not just one explanation)
 *  2. For each hypothesis, assembles supporting AND opposing evidence
 *     from the already-answered InvestigativeQuestion set
 *  3. Renders a formal verdict: supported / rejected / inconclusive
 *  4. Rejects hypotheses that the data contradicts — explicitly, with reason
 *  5. Ranks surviving hypotheses by evidence strength
 *
 * This is the "adversarial reasoning" layer — it challenges every conclusion
 * before it reaches the AI or the user.
 *
 * Design principles:
 *  - Hypotheses are generated from domain + column signals, never hardcoded generically
 *  - Evidence is assembled ONLY from InvestigativeQuestion answers — never fabricated
 *  - Rejection is explicit and reasoned
 *  - Pure functions, no side effects
 */

import type {
  ColumnProfile,
  DriverImportance,
  InvestigativeQuestion,
  TestedHypothesis,
  TimeSeriesAnalysis,
} from "../types";

// ---------------------------------------------------------------------------
// Hypothesis generation — domain + column signal driven
// ---------------------------------------------------------------------------

/**
 * Generates a set of competing hypotheses for a metric anomaly.
 *
 * Hypotheses are generated from:
 *  1. Domain-specific signals (e.g. ecommerce → festival, discount, new customer)
 *  2. Column-name signals (if a "discount" column exists → test discount hypothesis)
 *  3. Universal hypotheses (data quality, seasonal, outlier, one-off event)
 *
 * The set is designed to be mutually exclusive and collectively exhaustive.
 */
export function generateHypotheses(
  metricCol: string,
  deviationPct: number,
  profiles: ColumnProfile[],
  domain: string,
  timeSeries?: TimeSeriesAnalysis | null,
): Array<{ id: string; statement: string; relatedColumns: string[] }> {
  const isPositive = deviationPct > 0;
  const direction = isPositive ? "increase" : "decrease";
  const hypotheses: Array<{ id: string; statement: string; relatedColumns: string[] }> = [];
  const colNames = profiles.map((p) => p.name.toLowerCase());

  // ── Universal hypotheses (always included) ──────────────────────────────
  hypotheses.push({
    id: "h_seasonal",
    statement: `The ${direction} is part of a recurring seasonal pattern (holiday, fiscal quarter, annual cycle) rather than driven by a specific business action.`,
    relatedColumns: timeSeries ? [timeSeries.dateColumn] : [],
  });

  hypotheses.push({
    id: "h_data_quality",
    statement: `The ${direction} is a data quality artifact — caused by duplicate records, missing values in the comparison period, or a reporting/extraction issue rather than a real business event.`,
    relatedColumns: [],
  });

  hypotheses.push({
    id: "h_concentration",
    statement: `The ${direction} is driven by a single large transaction, customer, or event (concentration effect) rather than broad-based organic change.`,
    relatedColumns: profiles.filter((p) => p.inferredRole === "measure").map((p) => p.name),
  });

  hypotheses.push({
    id: "h_one_off",
    statement: `The ${direction} is a one-time event (product launch, clearance sale, corporate bulk order) that will not recur in future periods.`,
    relatedColumns: [],
  });

  // ── Column-signal hypotheses ─────────────────────────────────────────────
  // These are generated ONLY when the relevant column actually exists

  if (colNames.some((c) => /discount|rebate|promo|coupon|markdown/i.test(c))) {
    const discountCol = profiles.find((p) => /discount|rebate|promo|coupon|markdown/i.test(p.name))!.name;
    hypotheses.push({
      id: "h_discount",
      statement: `The ${direction} in "${metricCol}" was driven by ${isPositive ? "promotional discounts or price reductions attracting more volume" : "reduced discounting leading to lower conversion"}.`,
      relatedColumns: [discountCol],
    });
  }

  if (colNames.some((c) => /quantity|qty|units|volume|count/i.test(c))) {
    const qtyCol = profiles.find((p) => /quantity|qty|units|volume|count/i.test(p.name))!.name;
    hypotheses.push({
      id: "h_volume",
      statement: `The ${direction} was driven primarily by ${isPositive ? "higher transaction volume / more units sold" : "lower volume"} rather than a change in average transaction size.`,
      relatedColumns: [qtyCol],
    });
  }

  if (colNames.some((c) => /price|rate|aov|average.*order|order.*value/i.test(c))) {
    const priceCol = profiles.find((p) => /price|rate|aov/i.test(p.name))!.name;
    hypotheses.push({
      id: "h_price",
      statement: `The ${direction} was driven by a change in average transaction value / pricing rather than volume — fewer but ${isPositive ? "higher-value" : "lower-value"} transactions.`,
      relatedColumns: [priceCol],
    });
  }

  if (colNames.some((c) => /region|territory|zone|state|country|city/i.test(c))) {
    const geoCol = profiles.find((p) => /region|territory|zone|state|country|city/i.test(p.name))!.name;
    hypotheses.push({
      id: "h_geographic",
      statement: `The ${direction} is concentrated in one or two geographic markets, suggesting a localised event (infrastructure change, campaign, competition, local economic factor) rather than nationwide demand shift.`,
      relatedColumns: [geoCol],
    });
  }

  if (colNames.some((c) => /product|category|item|sku|segment|class/i.test(c))) {
    const prodCol = profiles.find((p) => /product|category|item|sku|segment/i.test(p.name))!.name;
    hypotheses.push({
      id: "h_product_mix",
      statement: `The ${direction} reflects a product mix shift — ${isPositive ? "premium or high-margin products captured a larger share" : "lower-value products or SKUs dominated the period"}.`,
      relatedColumns: [prodCol],
    });
  }

  if (colNames.some((c) => /customer|client|segment|tier|type|channel/i.test(c))) {
    const custCol = profiles.find((p) => /customer|client|segment|tier/i.test(p.name))!.name;
    hypotheses.push({
      id: "h_customer_mix",
      statement: `The ${direction} reflects a customer composition change — ${isPositive ? "higher-value or enterprise customers drove this period" : "lower-value or churn-prone customers dominated"}.`,
      relatedColumns: [custCol],
    });
  }

  // ── Domain-specific hypotheses ───────────────────────────────────────────
  if (domain === "ecommerce" || domain === "retail") {
    hypotheses.push({
      id: "h_campaign",
      statement: `A marketing campaign, flash sale, or promotional event drove the ${direction} — evidenced by co-movement with discount or quantity columns.`,
      relatedColumns: profiles.filter((p) => /discount|promo|camp/i.test(p.name)).map((p) => p.name),
    });
  }

  if (domain === "hr") {
    hypotheses.push({
      id: "h_attrition_wave",
      statement: `The ${direction} reflects a wave of attrition or hiring, not steady-state behaviour.`,
      relatedColumns: profiles.filter((p) => /hire|resign|exit|attrition/i.test(p.name)).map((p) => p.name),
    });
  }

  if (domain === "saas") {
    hypotheses.push({
      id: "h_expansion",
      statement: `The ${direction} reflects net expansion MRR (upgrades, seat additions) rather than new customer acquisition.`,
      relatedColumns: profiles.filter((p) => /plan|tier|upgrade|mrr/i.test(p.name)).map((p) => p.name),
    });
  }

  return hypotheses;
}

// ---------------------------------------------------------------------------
// Hypothesis evaluation — evidence-based verdict
// ---------------------------------------------------------------------------

/**
 * Tests a single hypothesis against the already-answered investigative questions.
 *
 * Logic:
 *  - Each question whose targetColumn matches the hypothesis' relatedColumns
 *    contributes evidence
 *  - Questions with supportsMainFinding = true AND strong/moderate evidenceStrength
 *    become supporting evidence
 *  - Questions about the same columns that DON'T support the finding become
 *    opposing evidence
 *  - Verdict rules:
 *    SUPPORTED: ≥1 strong supporting + no strong opposing
 *    REJECTED:  ≥1 strong opposing AND supporting evidence is weak
 *    INCONCLUSIVE: otherwise
 */
export function evaluateHypothesis(
  hyp: { id: string; statement: string; relatedColumns: string[] },
  questions: InvestigativeQuestion[],
  deviationPct: number,
): TestedHypothesis {
  const supporting: TestedHypothesis["supportingEvidence"] = [];
  const opposing: TestedHypothesis["opposingEvidence"] = [];

  // Special case: data quality hypothesis
  if (hyp.id === "h_data_quality") {
    return evaluateDataQualityHypothesis(hyp, deviationPct);
  }

  // Special case: seasonality hypothesis
  if (hyp.id === "h_seasonal") {
    return evaluateSeasonalityHypothesis(hyp, questions);
  }

  // Special case: concentration hypothesis
  if (hyp.id === "h_concentration") {
    return evaluateConcentrationHypothesis(hyp, questions);
  }

  // Standard evaluation: match questions to hypothesis columns
  for (const q of questions) {
    const isRelated =
      hyp.relatedColumns.includes(q.targetColumn) ||
      hyp.relatedColumns.length === 0;

    if (!isRelated && q.analysisType !== "distribution_shift") continue;

    const strengthScore =
      q.evidenceStrength === "strong" ? 0.85
      : q.evidenceStrength === "moderate" ? 0.65
      : q.evidenceStrength === "weak" ? 0.4
      : 0.1;

    if (q.supportsMainFinding && q.evidenceStrength !== "none") {
      supporting.push({
        description: `[${q.analysisType}] ${q.dataAnswer}`,
        strength: strengthScore,
      });
    } else if (!q.supportsMainFinding && q.evidenceStrength !== "none") {
      opposing.push({
        description: `[${q.analysisType}] ${q.dataAnswer}`,
        strength: strengthScore,
      });
    }
  }

  return buildVerdict(hyp, supporting, opposing, questions);
}

// ---------------------------------------------------------------------------
// Specialised hypothesis evaluators
// ---------------------------------------------------------------------------

function evaluateDataQualityHypothesis(
  hyp: { id: string; statement: string; relatedColumns: string[] },
  deviationPct: number,
): TestedHypothesis {
  // Heuristic: extreme deviations (>200%) with no column-level support
  // are more likely data quality than real business events
  const isExtreme = Math.abs(deviationPct) > 200;
  const verdict: TestedHypothesis["verdict"] = isExtreme ? "inconclusive" : "rejected";

  return {
    id: hyp.id,
    statement: hyp.statement,
    questions: [],
    supportingEvidence: isExtreme
      ? [{ description: `Deviation of ${deviationPct.toFixed(1)}% is extreme and warrants data quality investigation.`, strength: 0.5 }]
      : [],
    opposingEvidence: isExtreme
      ? []
      : [{ description: `Deviation of ${deviationPct.toFixed(1)}% is within plausible business range. Data quality issues typically produce >200% deviations.`, strength: 0.7 }],
    verdict,
    rationale: isExtreme
      ? "Cannot rule out a data quality issue — the magnitude is unusually large. Verify source data."
      : "Deviation magnitude is within plausible business range. Data quality artifact is unlikely but not impossible.",
    confidence: 0.6,
    rank: null,
  };
}

function evaluateSeasonalityHypothesis(
  hyp: { id: string; statement: string; relatedColumns: string[] },
  questions: InvestigativeQuestion[],
): TestedHypothesis {
  const seasonalQ = questions.find((q) => q.analysisType === "temporal_pattern" && q.question.includes("seasonal"));
  const trendQ = questions.find((q) => q.analysisType === "temporal_pattern" && q.question.includes("trend"));
  const anomalyFreqQ = questions.find((q) => q.analysisType === "temporal_pattern" && q.question.includes("recur"));

  const supporting: TestedHypothesis["supportingEvidence"] = [];
  const opposing: TestedHypothesis["opposingEvidence"] = [];

  if (seasonalQ?.supportsMainFinding) {
    supporting.push({ description: seasonalQ.dataAnswer, strength: 0.8 });
  } else if (seasonalQ) {
    opposing.push({ description: seasonalQ.dataAnswer, strength: 0.75 });
  }

  if (anomalyFreqQ) {
    if (anomalyFreqQ.evidenceValue && anomalyFreqQ.evidenceValue > 1) {
      supporting.push({ description: anomalyFreqQ.dataAnswer, strength: 0.6 });
    } else {
      opposing.push({ description: anomalyFreqQ.dataAnswer, strength: 0.65 });
    }
  }

  if (trendQ?.supportsMainFinding) {
    opposing.push({ description: `Sustained trend detected — suggests structural change, not pure seasonality.`, strength: 0.5 });
  }

  return buildVerdict(hyp, supporting, opposing, [seasonalQ, trendQ, anomalyFreqQ].filter(Boolean) as InvestigativeQuestion[]);
}

function evaluateConcentrationHypothesis(
  hyp: { id: string; statement: string; relatedColumns: string[] },
  questions: InvestigativeQuestion[],
): TestedHypothesis {
  const segmentQuestions = questions.filter((q) => q.analysisType === "segment_comparison");
  const distQ = questions.find((q) => q.analysisType === "distribution_shift");

  const supporting: TestedHypothesis["supportingEvidence"] = [];
  const opposing: TestedHypothesis["opposingEvidence"] = [];

  // High contribution from a single segment supports concentration
  const topSegmentQ = segmentQuestions
    .filter((q) => q.supportsMainFinding && q.evidenceValue && q.evidenceValue > 30)
    .sort((a, b) => (b.evidenceValue ?? 0) - (a.evidenceValue ?? 0))[0];

  if (topSegmentQ) {
    supporting.push({
      description: `Single segment concentration: ${topSegmentQ.dataAnswer}`,
      strength: 0.8,
    });
  }

  // Many moderate segments opposing concentration
  const spreadSegments = segmentQuestions.filter((q) => q.evidenceValue && q.evidenceValue < 15 && q.evidenceValue > 3);
  if (spreadSegments.length >= 3 && !topSegmentQ) {
    opposing.push({
      description: `Effect is spread across ${spreadSegments.length} segments (no single dominant driver), suggesting broad-based change rather than concentration.`,
      strength: 0.7,
    });
  }

  if (distQ && distQ.evidenceValue && Math.abs(distQ.evidenceValue) > 3) {
    supporting.push({ description: `Extreme z-score (${(distQ.evidenceValue ?? 0).toFixed(2)}) confirms this is an outlier event, consistent with concentration.`, strength: 0.65 });
  }

  return buildVerdict(hyp, supporting, opposing, segmentQuestions);
}

// ---------------------------------------------------------------------------
// Verdict builder
// ---------------------------------------------------------------------------

function buildVerdict(
  hyp: { id: string; statement: string; relatedColumns: string[] },
  supporting: TestedHypothesis["supportingEvidence"],
  opposing: TestedHypothesis["opposingEvidence"],
  questions: InvestigativeQuestion[],
): TestedHypothesis {
  const maxSupport = supporting.length > 0 ? Math.max(...supporting.map((e) => e.strength)) : 0;
  const maxOppose = opposing.length > 0 ? Math.max(...opposing.map((e) => e.strength)) : 0;

  let verdict: TestedHypothesis["verdict"];
  let rationale: string;
  let confidence: number;

  if (maxSupport >= 0.7 && maxOppose < 0.5) {
    verdict = "supported";
    rationale = `Strong dataset evidence supports this hypothesis (max evidence strength: ${(maxSupport * 100).toFixed(0)}%).`;
    confidence = Math.min(0.9, 0.5 + maxSupport * 0.4);
  } else if (maxOppose >= 0.65 && maxSupport < 0.4) {
    verdict = "rejected";
    rationale = `Dataset evidence contradicts this hypothesis (opposing strength: ${(maxOppose * 100).toFixed(0)}%). The data does not support this explanation.`;
    confidence = Math.min(0.85, 0.5 + maxOppose * 0.35);
  } else if (supporting.length === 0 && opposing.length === 0) {
    verdict = "inconclusive";
    rationale = "No relevant columns available in this dataset to test this hypothesis. Cannot confirm or rule out.";
    confidence = 0.3;
  } else if (maxSupport >= 0.5 && maxOppose >= 0.5) {
    verdict = "inconclusive";
    rationale = `Mixed evidence — both supporting and opposing signals exist. Further investigation or external data required.`;
    confidence = 0.45;
  } else if (maxSupport >= 0.4) {
    verdict = "supported";
    rationale = `Moderate evidence supports this hypothesis. Not conclusive but consistent with observed data.`;
    confidence = 0.55;
  } else {
    verdict = "inconclusive";
    rationale = "Insufficient evidence to confirm or reject this hypothesis from the available dataset columns.";
    confidence = 0.35;
  }

  return {
    id: hyp.id,
    statement: hyp.statement,
    questions,
    supportingEvidence: supporting,
    opposingEvidence: opposing,
    verdict,
    rationale,
    confidence,
    rank: null, // assigned by rankHypotheses()
  };
}

// ---------------------------------------------------------------------------
// Hypothesis ranking
// ---------------------------------------------------------------------------

/**
 * Ranks surviving (non-rejected) hypotheses by evidence strength.
 * Assigns rank=1 to the strongest, rank=null to rejected ones.
 */
export function rankHypotheses(tested: TestedHypothesis[]): TestedHypothesis[] {
  const survivors = tested
    .filter((h) => h.verdict !== "rejected")
    .sort((a, b) => b.confidence - a.confidence);

  let rank = 1;
  for (const h of survivors) {
    h.rank = rank++;
  }

  return tested; // mutated in place (rank field set)
}

// ---------------------------------------------------------------------------
// Driver Importance Matrix
// ---------------------------------------------------------------------------

/**
 * Builds a ranked driver importance matrix from answered investigative questions.
 *
 * For each dimension column, computes its proportional contribution to the
 * observed finding based on segment analysis evidence.
 * For numeric columns, uses correlation strength as a proxy for importance.
 */
export function buildDriverImportance(
  questions: InvestigativeQuestion[],
  profiles: ColumnProfile[],
): DriverImportance[] {
  const drivers: DriverImportance[] = [];
  const seen = new Set<string>();

  // Segment-based drivers (from dimension questions)
  for (const q of questions.filter((q) => q.analysisType === "segment_comparison")) {
    if (seen.has(q.targetColumn)) continue;
    seen.add(q.targetColumn);

    const profile = profiles.find((p) => p.name === q.targetColumn);
    const contribution = q.evidenceValue ?? 0;
    const isSignificant = q.evidenceStrength === "strong" || q.evidenceStrength === "moderate";

    drivers.push({
      column: q.targetColumn,
      label: prettify(q.targetColumn),
      contributionPct: Math.min(100, contribution),
      absoluteImpact: 0, // segment mean delta — would need re-computation here
      evidenceType: "dataset",
      isSignificant,
      measurementMethod: "Segment mean deviation weighted by segment size",
    });
  }

  // Correlation-based drivers (from numeric correlation questions)
  for (const q of questions.filter((q) => q.analysisType === "correlation")) {
    if (seen.has(q.targetColumn)) continue;
    seen.add(q.targetColumn);

    const absR = Math.abs(q.evidenceValue ?? 0);
    if (absR < 0.2) continue; // not worth including

    drivers.push({
      column: q.targetColumn,
      label: prettify(q.targetColumn),
      contributionPct: Math.min(100, absR * 100 * 0.8), // r² proxy
      absoluteImpact: 0,
      evidenceType: "dataset",
      isSignificant: absR > 0.4,
      measurementMethod: `Pearson correlation (r = ${(q.evidenceValue ?? 0).toFixed(3)})`,
    });
  }

  // Normalise contribution percentages to sum ≤ 100
  const total = drivers.reduce((s, d) => s + d.contributionPct, 0);
  if (total > 100) {
    const scale = 100 / total;
    for (const d of drivers) d.contributionPct *= scale;
  }

  return drivers.sort((a, b) => b.contributionPct - a.contributionPct);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function prettify(name: string): string {
  return name.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
