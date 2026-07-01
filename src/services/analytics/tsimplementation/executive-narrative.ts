/**
 * Executive Narrative Engine
 * --------------------------
 * Phase 2.5: Synthesises investigation results into SCQA-structured
 * consultant-grade narratives.
 *
 * SCQA = Situation → Complication → Question → Answer
 * (Barbara Minto's Pyramid Principle, used at McKinsey, BCG, Bain)
 *
 * Every narrative is:
 *  - Grounded in dataset evidence (never fabricated)
 *  - Explicit about rejected alternatives
 *  - Forward-looking (uses forecast data when available)
 *  - Actionable (specific recommendation tied to the finding)
 *  - Concise enough for a board slide headline
 *
 * Design: pure functions, no side effects.
 */

import type {
  DriverImportance,
  ExecutiveNarrative,
  ForecastResult,
  TestedHypothesis,
} from "../types";

// ---------------------------------------------------------------------------
// Main narrative builder
// ---------------------------------------------------------------------------

/**
 * Builds a full SCQA executive narrative from investigation components.
 */
export function buildExecutiveNarrative(
  metricCol: string,
  observedValue: number,
  baselineValue: number,
  deviationPct: number,
  leadingHypotheses: TestedHypothesis[],
  rejectedHypotheses: TestedHypothesis[],
  drivers: DriverImportance[],
  forecast: ForecastResult | undefined,
  domain: string,
): ExecutiveNarrative {
  const metric = prettify(metricCol);
  const isPositive = deviationPct > 0;
  const dirWord = isPositive ? "increased" : "decreased";
  const absPct = Math.abs(deviationPct).toFixed(1);

  // ── Situation: what happened, factually ──────────────────────────────────
  const situation = buildSituation(metric, observedValue, baselineValue, deviationPct, drivers);

  // ── Complication: why it matters / what's unusual ───────────────────────
  const complication = buildComplication(metric, deviationPct, leadingHypotheses, domain);

  // ── Question: the key business question this raises ──────────────────────
  const question = buildQuestion(metric, isPositive, leadingHypotheses, domain);

  // ── Answer: evidence-backed explanation ─────────────────────────────────
  const answer = buildAnswer(
    metric,
    leadingHypotheses,
    rejectedHypotheses,
    drivers,
  );

  // ── Outlook: what's likely next, from forecast ───────────────────────────
  const outlook = buildOutlook(metric, forecast, deviationPct, leadingHypotheses);

  // ── Recommended action ───────────────────────────────────────────────────
  const recommendedAction = buildRecommendedAction(
    metric,
    leadingHypotheses,
    drivers,
    isPositive,
    domain,
  );

  // ── Headline: one-sentence board-slide summary ───────────────────────────
  const headline = buildHeadline(metric, deviationPct, leadingHypotheses, isPositive);

  return {
    situation,
    complication,
    question,
    answer,
    outlook,
    recommendedAction,
    headline,
  };
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildSituation(
  metric: string,
  observedValue: number,
  baselineValue: number,
  deviationPct: number,
  drivers: DriverImportance[],
): string {
  const isPositive = deviationPct > 0;
  const absPct = Math.abs(deviationPct).toFixed(1);
  const topDriver = drivers[0];

  let situation =
    `${metric} ${isPositive ? "reached" : "fell to"} ${formatValue(observedValue)}, ` +
    `which is ${absPct}% ${isPositive ? "above" : "below"} the dataset average of ${formatValue(baselineValue)}.`;

  if (topDriver && topDriver.contributionPct > 15) {
    situation += ` The "${topDriver.label}" dimension accounts for approximately ${topDriver.contributionPct.toFixed(0)}% of the observed deviation.`;
  }

  return situation;
}

function buildComplication(
  metric: string,
  deviationPct: number,
  leadingHypotheses: TestedHypothesis[],
  domain: string,
): string {
  const absPct = Math.abs(deviationPct).toFixed(1);
  const isPositive = deviationPct > 0;

  if (isPositive) {
    const isEventDriven = leadingHypotheses.some((h) =>
      h.id === "h_seasonal" || h.id === "h_discount" || h.id === "h_campaign",
    );
    if (isEventDriven) {
      return (
        `While a ${absPct}% increase is significant, it may reflect a temporary event rather than sustainable growth. ` +
        `If this is event-driven, the business faces a "regression to mean" risk once the event passes — ` +
        `strategic decisions should not assume this performance level will persist.`
      );
    }
    return (
      `A ${absPct}% increase requires investigation: sustainable growth driven by structural demand is very different from ` +
      `a transient spike driven by price cuts, concentration in one segment, or a data anomaly. ` +
      `Acting on the wrong explanation could lead to over-investment or missed replication opportunity.`
    );
  } else {
    return (
      `A ${absPct}% decline in ${metric} is a material signal that demands investigation. ` +
      `Without understanding the root cause, the business risks deploying the wrong intervention — ` +
      `e.g., cutting prices when the issue is actually distribution, or investing in acquisition when retention is the problem.`
    );
  }
}

function buildQuestion(
  metric: string,
  isPositive: boolean,
  leadingHypotheses: TestedHypothesis[],
  domain: string,
): string {
  const topH = leadingHypotheses[0];

  if (!topH) {
    return `What is driving the observed ${isPositive ? "increase" : "decrease"} in ${metric}, and is it sustainable?`;
  }

  // Tailor the question to the leading hypothesis
  if (topH.id === "h_seasonal") {
    return `Is the ${metric} pattern genuinely seasonal, and if so, how should the business prepare for the next cycle?`;
  }
  if (topH.id === "h_discount" || topH.id === "h_campaign") {
    return `Is the ${metric} performance driven by promotional activity, and what is the underlying organic performance?`;
  }
  if (topH.id === "h_concentration") {
    return `Is ${metric} performance being driven by a concentrated single-segment effect, and does this create business risk?`;
  }
  if (topH.id === "h_geographic") {
    return `Which specific markets are driving ${metric} performance, and how should regional strategy be adjusted?`;
  }
  if (topH.id === "h_product_mix") {
    return `Is the ${metric} movement a product mix shift, and what does this imply for the portfolio strategy?`;
  }
  return `What is the primary driver of the observed change in ${metric}, and what action should the business take?`;
}

function buildAnswer(
  metric: string,
  leadingHypotheses: TestedHypothesis[],
  rejectedHypotheses: TestedHypothesis[],
  drivers: DriverImportance[],
): string {
  let answer = "";

  // Lead with the strongest surviving hypothesis
  const topH = leadingHypotheses[0];
  if (topH) {
    answer += `The evidence most strongly supports: "${topH.statement}" (confidence: ${(topH.confidence * 100).toFixed(0)}%). `;
    if (topH.supportingEvidence.length > 0) {
      answer += `Key evidence: ${topH.supportingEvidence[0].description} `;
    }
  }

  // Acknowledge the second hypothesis if present
  const secondH = leadingHypotheses[1];
  if (secondH) {
    answer += `A secondary contributing factor may be "${secondH.statement.split(" — ")[0]}". `;
  }

  // Explicitly state what was ruled out
  if (rejectedHypotheses.length > 0) {
    const topRejected = rejectedHypotheses[0];
    answer +=
      `The following explanation was considered and rejected based on dataset evidence: "${topRejected.statement.split(".")[0]}" — ${topRejected.rationale} `;
  }

  // Driver matrix summary
  const sigDrivers = drivers.filter((d) => d.isSignificant).slice(0, 3);
  if (sigDrivers.length > 0) {
    answer +=
      `Driver importance: ${sigDrivers.map((d) => `${d.label} (${d.contributionPct.toFixed(0)}%)`).join(", ")}.`;
  }

  return answer.trim() || "Insufficient evidence to determine a primary driver from the available dataset columns.";
}

function buildOutlook(
  metric: string,
  forecast: ForecastResult | undefined,
  deviationPct: number,
  leadingHypotheses: TestedHypothesis[],
): string {
  if (!forecast || forecast.nextPeriods.length === 0) {
    const isPositive = deviationPct > 0;
    const isSeasonalH = leadingHypotheses.some((h) => h.id === "h_seasonal" && h.verdict === "supported");
    if (isSeasonalH) {
      return `If the seasonal pattern holds, ${metric} should ${isPositive ? "normalise downward" : "recover"} in coming periods. Monitor against seasonal indices from prior years.`;
    }
    return `Insufficient time-series data to generate a statistical forecast. Monitor ${metric} over the next 2–3 periods to determine if this is a trend change or a one-off.`;
  }

  const next = forecast.nextPeriods[0];
  const nextLabel = next.period;
  const predicted = formatValue(next.predicted);
  const lower = formatValue(next.lower);
  const upper = formatValue(next.upper);

  return (
    `Based on the ${forecast.method.replace(/_/g, " ")} model (confidence: ${(forecast.confidence * 100).toFixed(0)}%), ` +
    `${metric} is projected at ${predicted} for ${nextLabel} ` +
    `(95% range: ${lower} – ${upper}). ` +
    `Assumptions: ${forecast.assumptions[0] ?? "see model details"}. ` +
    `Key risk: ${forecast.risks[0] ?? "model reliability decreases with forecast horizon"}.`
  );
}

function buildRecommendedAction(
  metric: string,
  leadingHypotheses: TestedHypothesis[],
  drivers: DriverImportance[],
  isPositive: boolean,
  domain: string,
): string {
  const topH = leadingHypotheses[0];
  const topDriver = drivers[0];

  if (!topH) {
    return `Conduct a deeper data investigation with additional breakdowns by time period, customer segment, and product category before taking business action on this finding.`;
  }

  // Hypothesis-specific recommendations
  if (topH.id === "h_seasonal" && topH.verdict === "supported") {
    return isPositive
      ? `The seasonal peak is confirmed. Prepare inventory, staffing, and marketing investment ahead of the next seasonal window. Build a promotional calendar based on the detected high-season periods.`
      : `The seasonal trough is expected. Use this period for strategic initiatives (product launches, infrastructure improvements) that would be disrupted during peak seasons.`;
  }

  if (topH.id === "h_discount" && topH.verdict === "supported") {
    return isPositive
      ? `Discounting is driving the uplift. Measure the true margin-adjusted impact before expanding promotions — volume increase without margin preservation is not sustainable growth.`
      : `Reduced discounting is hurting conversion. A/B test targeted promotions for high-value segments before broadly reinstating discount levels.`;
  }

  if (topH.id === "h_concentration" && topH.verdict === "supported") {
    const topSeg = topDriver?.label ?? "the top segment";
    return isPositive
      ? `Performance is concentrated in ${topSeg}. While this is positive, it creates dependency risk. Develop a plan to replicate the ${topSeg} success pattern in the next 2–3 largest segments.`
      : `The decline is concentrated in ${topSeg}. Investigate ${topSeg} specifically — do not apply broad interventions across all segments based on what is a localised issue.`;
  }

  if (topH.id === "h_geographic" && topH.verdict === "supported") {
    const geoDriver = drivers.find((d) => /region|country|state|city/i.test(d.column));
    return geoDriver
      ? `Focus investigation on ${geoDriver.label} specifically. Deploy targeted resources (sales coverage, logistics, marketing) to ${isPositive ? "amplify" : "address"} the geographic driver before investing broadly.`
      : `Geographic concentration confirmed. Review regional strategy and resource allocation.`;
  }

  if (topH.id === "h_product_mix" && topH.verdict === "supported") {
    return isPositive
      ? `Premium product mix is driving value improvement. Prioritise stock availability and marketing investment in high-value SKUs before the next peak period.`
      : `Unfavourable product mix is dragging performance. Review merchandising and promotional strategy to shift customer preference toward higher-margin products.`;
  }

  // Fallback recommendation
  return (
    `The primary driver identified is "${topH.statement.split(".")[0]}". ` +
    `Validate this finding with the ${domain} team before acting. ` +
    `If confirmed, focus intervention on ${topDriver?.label ?? "the top contributing dimension"} first — it accounts for the largest share of the observed deviation.`
  );
}

function buildHeadline(
  metric: string,
  deviationPct: number,
  leadingHypotheses: TestedHypothesis[],
  isPositive: boolean,
): string {
  const absPct = Math.abs(deviationPct).toFixed(1);
  const topH = leadingHypotheses[0];
  const dirWord = isPositive ? "surged" : "declined";

  if (!topH) {
    return `${metric} ${dirWord} ${absPct}% — primary driver not yet identified; investigation required.`;
  }

  // Concise headline based on leading hypothesis
  if (topH.id === "h_seasonal") {
    return `${metric} ${dirWord} ${absPct}% — seasonal pattern confirmed, driven by recurring high-period demand.`;
  }
  if (topH.id === "h_discount") {
    return `${metric} ${dirWord} ${absPct}% — primarily driven by promotional pricing; assess margin impact.`;
  }
  if (topH.id === "h_volume") {
    return `${metric} ${dirWord} ${absPct}% — volume-driven change; pricing held steady.`;
  }
  if (topH.id === "h_geographic") {
    return `${metric} ${dirWord} ${absPct}% — geographic concentration in one or two key markets.`;
  }
  if (topH.id === "h_product_mix") {
    return `${metric} ${dirWord} ${absPct}% — product mix shift toward ${isPositive ? "higher" : "lower"}-value items.`;
  }
  if (topH.id === "h_concentration") {
    return `${metric} ${dirWord} ${absPct}% — concentrated single-segment effect, not broad-based change.`;
  }
  if (topH.id === "h_campaign") {
    return `${metric} ${dirWord} ${absPct}% — campaign or promotional event identified as likely driver.`;
  }

  return `${metric} ${dirWord} ${absPct}% — investigation complete; see evidence chain for details.`;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function prettify(name: string): string {
  return name.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(2);
}
