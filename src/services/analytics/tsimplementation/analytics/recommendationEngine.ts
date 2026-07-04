import type { BusinessDomain, KPI } from "../../types";
import { AnomalyResult } from "./anomalyEngine";
import { CorrelationResult } from "./correlationEngine";
import { prettify } from "../eda";

export interface ActionableRecommendation {
  id: string;
  action: string;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
  priority: "critical" | "high" | "medium" | "low";
  riskOfInaction: string;
  successMetric: string;
  timeHorizon: "immediate" | "short_term" | "medium_term" | "long_term";
  reasoning: string;
  confidence: number;
}

/**
 * Automatically converts anomalies, KPIs, and correlations into high-level business recommendations.
 */
export function generateRecommendations(
  domain: BusinessDomain,
  kpis: KPI[],
  anomalies: AnomalyResult[],
  correlations: CorrelationResult[],
): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = [];
  let recIdCounter = 0;
  const nextId = () => `rec_${recIdCounter++}`;

  // Helper to find a KPI by ID
  const getKpi = (key: string) => kpis.find((k) => k.id.includes(key));

  // 1. Process Anomalies First (Critical/High priority recommendations)
  for (const anomaly of anomalies) {
    if (anomaly.type === "negative_inventory" && anomaly.column) {
      recommendations.push({
        id: nextId(),
        action: `Perform immediate physical stock audit for column '${prettify(anomaly.column)}'`,
        expectedImpact:
          "Reconcile inventory accounting discrepancy and prevent operational backorders.",
        effort: "medium",
        priority: "critical",
        riskOfInaction:
          "Inaccurate stock listings leading to checkout failures and customer churn.",
        successMetric: "Zero negative inventory counts across stock logs.",
        timeHorizon: "immediate",
        reasoning: `Found negative inventory counts in column '${anomaly.column}' representing database mismatch.`,
        confidence: 0.95,
      });
    }

    if (anomaly.type === "negative_revenue" && anomaly.column) {
      recommendations.push({
        id: nextId(),
        action: `Audit billing adjustments and credit notes in column '${prettify(anomaly.column)}'`,
        expectedImpact:
          "Correct double-counted write-offs or sales entries causing negative values.",
        effort: "medium",
        priority: "critical",
        riskOfInaction: "Inaccurate financial reports and compliance audits.",
        successMetric: "Resolution of negative sales numbers in monthly records.",
        timeHorizon: "immediate",
        reasoning: `Detected impossible negative sales values in '${anomaly.column}'.`,
        confidence: 0.9,
      });
    }

    if (anomaly.type === "duplicate_transaction") {
      recommendations.push({
        id: nextId(),
        action: "Implement unique transaction token checks in the payment gateway API",
        expectedImpact: "Eradicate double-billing and refund processing overhead.",
        effort: "low",
        priority: "high",
        riskOfInaction: "Chargeback penalties, customer complaints, and duplicated revenues.",
        successMetric: "Zero duplicate transaction flags in transaction audits.",
        timeHorizon: "immediate",
        reasoning: `Detected duplicate transactions with matching timestamps and prices.`,
        confidence: 0.95,
      });
    }
  }

  // 2. Domain-specific KPI optimization recommendations
  if (domain === "ecommerce" || domain === "retail") {
    const revKpi = getKpi("revenue");
    const marginKpi = getKpi("margin");
    const discountKpi = getKpi("discount_rate");

    // Scenario: High discount causing low margin
    const discountVal = discountKpi ? Number(discountKpi.value) : 0;
    const marginVal = marginKpi ? Number(marginKpi.value) : 0;

    if (discountVal > 15 && marginVal < 30) {
      recommendations.push({
        id: nextId(),
        action: "Reduce base discount rates by 10% and shift to bundled promotional offers",
        expectedImpact:
          "Increase overall gross margin percentage by 3-5 percentage points without dropping transaction counts.",
        effort: "low",
        priority: "high",
        riskOfInaction: "Erosion of net profits despite top-line sales volume.",
        successMetric: "Gross margin restoration above 35%.",
        timeHorizon: "short_term",
        reasoning: `E-commerce margins are low (${marginVal.toFixed(1)}%) while average discounts are high (${discountVal.toFixed(1)}%).`,
        confidence: 0.85,
      });
    }
  }

  if (domain === "saas") {
    const churnKpi = getKpi("churn_rate");
    const churnVal = churnKpi ? Number(churnKpi.value) : 0;

    if (churnVal > 5) {
      recommendations.push({
        id: nextId(),
        action: "Launch a customer health tracking dashboard and proactive renewal playbooks",
        expectedImpact: "Reduce subscription churn rate under the 3% target.",
        effort: "high",
        priority: "high",
        riskOfInaction:
          "Unsustainable customer acquisition cost (CAC) treadmill as users drop off.",
        successMetric: "Month-over-month churn rate decrease below 3%.",
        timeHorizon: "medium_term",
        reasoning: `Calculated churn rate of ${churnVal.toFixed(1)}% is above the healthy SaaS benchmark of <5%.`,
        confidence: 0.9,
      });
    }
  }

  if (domain === "hr") {
    const attrKpi = getKpi("attrition");
    const attrVal = attrKpi ? Number(attrKpi.value) : 0;

    if (attrVal > 15) {
      recommendations.push({
        id: nextId(),
        action: "Conduct targeted compensation audits and department retention interviews",
        expectedImpact: "Stem workforce attrition and lower recruitment and onboarding costs.",
        effort: "medium",
        priority: "high",
        riskOfInaction: "Loss of institutional knowledge and delayed project timelines.",
        successMetric: "Reduction of annual attrition below 10%.",
        timeHorizon: "medium_term",
        reasoning: `Employee attrition rate is high at ${attrVal.toFixed(1)}%, signaling cultural or market pay mismatch.`,
        confidence: 0.85,
      });
    }
  }

  // 3. Correlation-based recommendations
  for (const corr of correlations) {
    if (corr.strength === "strong_positive") {
      const isMarketingSpend = ["spend", "marketing", "ads", "budget"].some(
        (k) => corr.a.toLowerCase().includes(k) || corr.b.toLowerCase().includes(k),
      );
      const isRevenue = ["revenue", "sales", "conversions"].some(
        (k) => corr.a.toLowerCase().includes(k) || corr.b.toLowerCase().includes(k),
      );

      if (isMarketingSpend && isRevenue) {
        recommendations.push({
          id: nextId(),
          action: "Increase marketing ad budget allocate to high-performing channels",
          expectedImpact:
            "Drive proportional growth in top-line revenue based on strong correlation.",
          effort: "low",
          priority: "medium",
          riskOfInaction:
            "Leaving potential sales growth on the table by under-funding acquisition.",
          successMetric: "Pro-rata increase in overall revenue totals.",
          timeHorizon: "short_term",
          reasoning: `Found a strong positive correlation (${corr.r.toFixed(2)}) between spend and revenue.`,
          confidence: 0.9,
        });
      }
    }
  }

  // Fallback: If no recommendations generated, build basic generic ones
  if (recommendations.length === 0) {
    recommendations.push({
      id: nextId(),
      action: "Review data schemas and establish standard KPI dashboards",
      expectedImpact: "Uniform transparency of business performance across departments.",
      effort: "low",
      priority: "medium",
      riskOfInaction: "Lack of metrics accountability and delayed decision responses.",
      successMetric: "Dashboard adoption rate across stakeholders.",
      timeHorizon: "short_term",
      reasoning: "Establish basic monitoring baseline.",
      confidence: 0.8,
    });
  }

  return recommendations;
}
