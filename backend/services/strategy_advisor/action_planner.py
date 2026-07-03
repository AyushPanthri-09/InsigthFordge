import uuid
from typing import List
from backend.services.business_analyst.contracts import Recommendation
from backend.services.strategy_advisor.contracts import ActionPlan, ConfidenceBreakdown

class ActionPlannerEngine:
    """
    Formulates chronological action tasks (Immediate, 30 Days, etc.)
    with owners, dependencies, outcomes, and execution criteria.
    """

    @staticmethod
    def generate_action_plans(
        recommendations: List[Recommendation],
        dq_conf: float
    ) -> List[ActionPlan]:
        """
        Translates business recommendations into sequenced Action Plans.
        """
        plans = []
        
        # Chronological milestones list
        milestones = ["Immediate", "30 Days", "90 Days", "6 Months", "12 Months"]

        for i, rec in enumerate(recommendations):
            action_id = f"act_{uuid.uuid4().hex[:6]}"
            
            # Map rec properties
            milestone = milestones[min(i, len(milestones) - 1)]
            owner = rec.owner
            outcome = rec.expected_outcome
            kpi = rec.observation.split("'")[1] if "'" in rec.observation else "general_performance"
            
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=rec.confidence_breakdown.statistical_confidence,
                business_confidence=rec.confidence_breakdown.business_confidence,
                overall_confidence=dq_conf * 0.9 * rec.confidence_breakdown.statistical_confidence * rec.confidence_breakdown.business_confidence
            )

            # Build dependency link (previous action if any, preventing cycles by linking sequentially)
            dependencies = [plans[-1].action_id] if plans else []

            plans.append(ActionPlan(
                evidence_ids=rec.evidence_ids,
                confidence_breakdown=conf,
                reasoning_path=f"Compiled chronological action plan mapping to recommendation '{rec.rec_id}'",
                action_id=action_id,
                milestone=milestone,
                owner=owner,
                dependencies=dependencies,
                expected_outcome=outcome,
                target_kpi=kpi,
                priority=rec.priority,
                effort="medium" if rec.priority == "High" else "low",
                confidence=conf.overall_confidence
            ))

        # Default fallback action
        if not plans:
            conf_fail = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=1.0,
                business_confidence=1.0,
                overall_confidence=dq_conf * 0.9
            )
            plans.append(ActionPlan(
                evidence_ids=[],
                confidence_breakdown=conf_fail,
                reasoning_path="Generated baseline action plan.",
                action_id="act_baseline_audit",
                milestone="Immediate",
                owner="Operations Manager",
                dependencies=[],
                expected_outcome="Maintain continuous health alerts.",
                target_kpi="dataset_health",
                priority="Low",
                effort="low",
                confidence=conf_fail.overall_confidence
            ))

        return plans
