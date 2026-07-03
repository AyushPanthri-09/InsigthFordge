import uuid
from typing import List
from backend.services.business_analyst.contracts import Recommendation
from backend.services.strategy_advisor.contracts import Scenario, ConfidenceBreakdown

class ScenarioPlannerEngine:
    """
    Formulates Conservative, Balanced, and Aggressive operational scenarios
    using verified statistical findings and recommendations.
    """

    @staticmethod
    def generate_scenarios(
        recommendations: List[Recommendation],
        dq_conf: float
    ) -> List[Scenario]:
        """
        Builds strategic scenarios with assumptions, required efforts, timelines, and benefits.
        """
        scenarios = []
        evidence_ids = []
        for r in recommendations:
            evidence_ids.extend(r.evidence_ids)
        evidence_ids = list(set(evidence_ids))

        # 1. Conservative Scenario
        scen_id1 = f"scen_con_{uuid.uuid4().hex[:6]}"
        conf1 = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=0.95,
            business_confidence=0.70,
            overall_confidence=dq_conf * 0.9 * 0.95 * 0.70
        )
        scenarios.append(Scenario(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf1,
            reasoning_path="Constructed Conservative scenario minimizing capital expenditure.",
            scenario_type="Conservative",
            expected_benefits="Stabilize declining core KPIs, protect margins, and minimize budget expansion.",
            expected_risks="Reduced growth velocity and potential opportunity cost.",
            confidence=conf1.overall_confidence,
            required_effort="low",
            timeline="30-60 days",
            assumptions=["Operating budget remains flat.", "No additional headcount or marketing expansions."]
        ))

        # 2. Balanced Scenario
        scen_id2 = f"scen_bal_{uuid.uuid4().hex[:6]}"
        conf2 = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=0.85,
            business_confidence=0.80,
            overall_confidence=dq_conf * 0.9 * 0.85 * 0.80
        )
        scenarios.append(Scenario(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf2,
            reasoning_path="Constructed Balanced scenario seeking moderate expansion.",
            scenario_type="Balanced",
            expected_benefits="Accelerated growth by replicating high-performance segment slices.",
            expected_risks="Moderate budget realignment and operational friction.",
            confidence=conf2.overall_confidence,
            required_effort="medium",
            timeline="90 days",
            assumptions=["Targeted allocation of promotional marketing spend.", "Milestone dependencies resolved on schedule."]
        ))

        # 3. Aggressive Scenario
        scen_id3 = f"scen_agg_{uuid.uuid4().hex[:6]}"
        conf3 = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=0.70,
            business_confidence=0.90,
            overall_confidence=dq_conf * 0.9 * 0.70 * 0.90
        )
        scenarios.append(Scenario(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf3,
            reasoning_path="Constructed Aggressive scenario aiming for maximum scale.",
            scenario_type="Aggressive",
            expected_benefits="Maximizes market share expansion by aggressively riding growth vectors.",
            expected_risks="High capital expenditure burn rate and operational exposure.",
            confidence=conf3.overall_confidence,
            required_effort="high",
            timeline="12 months",
            assumptions=["Major budget expansion approved.", "Hiring dedicated owners for segment categories."]
        ))

        return scenarios
