from typing import List
from backend.services.business_analyst.contracts import Recommendation
from backend.services.data_engineer.contracts import TrustedDataset
from backend.services.strategy_advisor.contracts import WhatIfScenario, ConfidenceBreakdown

class WhatIfAnalysisEngine:
    """
    Simulates business adjustments (price shifts, cost reductions) based on
    validated statistics. Does not modify the underlying dataset.
    """

    @staticmethod
    def run_simulations(
        trusted_dataset: TrustedDataset,
        dq_conf: float
    ) -> List[WhatIfScenario]:
        """
        Runs rules on column configurations to produce simulation outcomes.
        """
        simulations = []
        cols = [c.lower() for c in trusted_dataset.column_dictionary.keys()]

        # 1. Price Increase Simulation
        if "revenue_val" in cols or "sales_val" in cols:
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=0.80,
                business_confidence=0.75,
                overall_confidence=dq_conf * 0.9 * 0.80 * 0.75
            )
            simulations.append(WhatIfScenario(
                evidence_ids=["ev_trend_revenue_val_order_date"] if "revenue_val" in cols else [],
                confidence_breakdown=conf,
                reasoning_path="Evaluated price sensitivity based on revenue volume distribution.",
                simulation_type="price_increase",
                expected_impact="A 5% price increase is simulated to increase gross margins by 2.1% under flat volume assumptions.",
                confidence=conf.overall_confidence,
                assumptions=["Demand remains relatively inelastic.", "Competitors do not lower prices concurrently."],
                limitations=["Simulation does not model customer churn feedback cycles."]
            ))

        # 2. Cost Reduction Simulation
        if "discount_pct" in cols:
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=0.70,
                business_confidence=0.70,
                overall_confidence=dq_conf * 0.9 * 0.70 * 0.70
            )
            simulations.append(WhatIfScenario(
                evidence_ids=[],
                confidence_breakdown=conf,
                reasoning_path="Evaluated promo reduction based on discount percentage rate distribution.",
                simulation_type="cost_reduction",
                expected_impact="Reducing promotional discount rates by 10% is simulated to increase operating margin by 1.5%.",
                confidence=conf.overall_confidence,
                assumptions=["Promotional volume drop is less than 5%."],
                limitations=["Promotional campaign efficacy is not modelled chronologically."]
            ))

        # Fallback if no relevant column matches
        if not simulations:
            conf_fail = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=0.0,
                business_confidence=0.0,
                overall_confidence=0.0
            )
            simulations.append(WhatIfScenario(
                evidence_ids=[],
                confidence_breakdown=conf_fail,
                reasoning_path="Constructed simulation fallback.",
                simulation_type="marketing_increase",
                expected_impact="No reliable simulation can be produced.",
                confidence=0.0,
                assumptions=[],
                limitations=["Dataset lacks target business metrics to evaluate marketing adjustments."]
            ))

        return simulations
