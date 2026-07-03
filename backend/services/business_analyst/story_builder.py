import uuid
from typing import List
from backend.services.business_analyst.contracts import BusinessNarrative, Recommendation

class ExecutiveStoryBuilder:
    """
    Transforms validated analytical results and recommendations into a structured,
    non-hallucinated executive narrative hierarchy.
    """

    @staticmethod
    def build_narratives(
        recommendations: List[Recommendation]
    ) -> List[BusinessNarrative]:
        """
        Converts each validated recommendation into an executive story structure.
        """
        narratives = []
        
        for rec in recommendations:
            narrative_id = f"story_{rec.rec_id}_{uuid.uuid4().hex[:6]}"
            
            situation = "Audit of dataset transaction performance and key metrics."
            finding = rec.observation
            evidence = f"Statistical verification path: {rec.reasoning_path} (Overall confidence: {rec.confidence_breakdown.overall_confidence:.1%})."
            meaning = rec.business_reason
            recommendation_txt = f"Implement corrective action assigned to '{rec.owner}' (Timeline: {rec.timeline})."
            impact = f"{rec.expected_outcome} (Expected ROI: {rec.roi:.1%})."

            narratives.append(BusinessNarrative(
                evidence_ids=rec.evidence_ids,
                confidence_breakdown=rec.confidence_breakdown,
                reasoning_path=f"Synthesized narrative story for recommendation '{rec.rec_id}'",
                narrative_id=narrative_id,
                situation=situation,
                finding=finding,
                evidence=evidence,
                business_meaning=meaning,
                recommendation=recommendation_txt,
                expected_business_impact=impact
            ))

        return narratives
