import type { BusinessDomain, KPI } from "../../types";
import { AnomalyResult } from "./anomalyEngine";
import { CorrelationResult } from "./correlationEngine";
import { ActionableRecommendation } from "./recommendationEngine";
import { prettify } from "../eda";

export interface SCQANarrative {
  situation: string;
  complication: string;
  insight: string;
  recommendation: string;
  expectedOutcome: string;
}

/**
 * Automatically synthesizes a consultant-style business narrative using the SCQA framework.
 */
export function generateSCQANarrative(
  domain: BusinessDomain,
  rowCount: number,
  kpis: KPI[],
  anomalies: AnomalyResult[],
  correlations: CorrelationResult[],
  recommendations: ActionableRecommendation[]
): SCQANarrative {
  const getKpi = (key: string) => kpis.find(k => k.id.includes(key));
  const primaryKpi = kpis.filter(k => k.id !== "kpi_total_records")[0];

  // 1. SITUATION
  let situation = `The dataset represents operational records for the ${prettify(domain)} domain, containing ${rowCount.toLocaleString()} transactions. `;
  if (primaryKpi) {
    situation += `Key business processes are anchored around optimizing '${primaryKpi.label}', which currently sits at a calculated value of ${primaryKpi.formattedValue}. `;
  } else {
    situation += "Standard operational variables and metrics were analyzed to assess current performance parameters.";
  }

  // 2. COMPLICATION
  let complication = "However, our analysis reveals critical constraints. ";
  const critAnomalies = anomalies.filter(a => a.severity === "CRITICAL" || a.severity === "HIGH");
  if (critAnomalies.length > 0) {
    complication += `We identified ${critAnomalies.length} high-severity anomalies, notably ${critAnomalies[0].description.replace(/\.$/, "")}. `;
  } else {
    complication += "Our diagnostic checks flagged potential inefficiencies and variance within key measures that limit top-line execution. ";
  }

  // 3. INSIGHT
  let insight = "From a statistical standpoint, ";
  if (correlations.length > 0) {
    const topCorr = correlations[0];
    insight += `there is a ${topCorr.explanation.replace(/\.$/, "")}, suggesting that these metrics do not act in isolation. `;
  } else {
    insight += "the relationships between dimension categories and measures indicate that performance is heavily segmented. ";
  }

  // 4. RECOMMENDATION
  let recommendation = "To resolve these constraints, the primary recommendation is to ";
  if (recommendations.length > 0) {
    recommendation += `${recommendations[0].action.charAt(0).toLowerCase() + recommendations[0].action.slice(1)}. `;
  } else {
    recommendation += "implement standardized metric dashboards and establish data audit checks. ";
  }

  // 5. EXPECTED OUTCOME
  let expectedOutcome = "By executing these actions, the business expects to ";
  if (recommendations.length > 0) {
    expectedOutcome += `${recommendations[0].expectedImpact.charAt(0).toLowerCase() + recommendations[0].expectedImpact.slice(1)} `;
  } else {
    expectedOutcome += "restore operational stability, correct accounting discrepancies, and enhance forecasting accuracy. ";
  }
  expectedOutcome += "Failure to act poses significant risks, including operational write-offs and customer churn.";

  return {
    situation,
    complication,
    insight,
    recommendation,
    expectedOutcome
  };
}

/**
 * Formats the SCQA structure into a single coherent natural-language string.
 */
export function compileSCQANarrativeText(scqa: SCQANarrative): string {
  return [
    `**Situation:** ${scqa.situation}`,
    `**Complication:** ${scqa.complication}`,
    `**Insight:** ${scqa.insight}`,
    `**Recommendation:** ${scqa.recommendation}`,
    `**Expected Outcome:** ${scqa.expectedOutcome}`
  ].join("\n\n");
}
