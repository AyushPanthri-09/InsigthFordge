from typing import List, Dict, Any
from backend.services.business_analyst.contracts import (
    BusinessAnalystResult,
    Recommendation,
    RootCause
)

class BusinessAnalystValidator:
    """
    Enforces Scientific Validation Gates on business findings, root causes,
    and prioritized recommendations.
    """

    @staticmethod
    def enforce_gates(result: BusinessAnalystResult) -> BusinessAnalystResult:
        """
        Applies validation gates. Filters recommendations by confidence thresholds
        and ensures all findings trace to statistical evidence.
        """
        validated = result.model_copy()
        
        # 1. Reject low confidence recommendations (< 60% overall confidence)
        valid_recs = []
        for rec in validated.recommendations:
            overall_conf = rec.confidence_breakdown.overall_confidence
            if overall_conf >= 0.60:
                valid_recs.append(rec)
            else:
                # Add limitation/warning log
                validated.global_limitations.append(
                    f"Recommendation '{rec.rec_id}' rejected due to insufficient overall confidence ({overall_conf:.2%})."
                )
        validated.recommendations = valid_recs

        # 2. Verify Root Causes have supporting evidence
        valid_causes = []
        for cause in validated.root_causes:
            if not cause.supporting_evidence:
                cause.observation = "No validated root cause could be established."
                cause.validation_status = "warning"
                cause.limitations.append("Insufficient statistical support to prove root cause.")
            valid_causes.append(cause)
        validated.root_causes = valid_causes

        # 3. Ensure prioritized recommendations are synchronized
        valid_prioritized = []
        valid_rec_ids = {r.rec_id for r in validated.recommendations}
        for prio in validated.prioritized_recommendations:
            if prio.rec_id in valid_rec_ids:
                valid_prioritized.append(prio)
        validated.prioritized_recommendations = valid_prioritized

        # Adjust overall status based on limitations
        if any("rejected" in limit.lower() for limit in validated.global_limitations):
            validated.overall_validation_status = "warning"

        return validated
