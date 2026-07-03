import uuid
from typing import List, Dict
from backend.services.strategy_advisor.contracts import ActionPlan, Roadmap, ConfidenceBreakdown

class RoadmapGeneratorEngine:
    """
    Groups actions into executive milestone bins while preserving dependency linkages.
    """

    @staticmethod
    def generate_roadmap(
        action_plans: List[ActionPlan],
        dq_conf: float
    ) -> Roadmap:
        """
        Structures the Roadmap from chronological action items.
        """
        roadmap_id = f"road_{uuid.uuid4().hex[:6]}"
        milestone_dict = {}
        evidence_ids = []

        for action in action_plans:
            evidence_ids.extend(action.evidence_ids)
            m = action.milestone
            if m not in milestone_dict:
                milestone_dict[m] = []
            milestone_dict[m].append(action)

        evidence_ids = list(set(evidence_ids))

        # Propagate average overall confidence
        avg_overall = sum(a.confidence for a in action_plans) / len(action_plans) if action_plans else 1.0
        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=1.0,
            business_confidence=1.0,
            overall_confidence=avg_overall
        )

        return Roadmap(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Generated milestone-binned strategic roadmap.",
            roadmap_id=roadmap_id,
            milestones=milestone_dict
        )
