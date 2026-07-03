from typing import List
from backend.services.business_analyst.contracts import Recommendation, PrioritizedRecommendation

class DecisionPrioritizationEngine:
    """
    Ranks validated recommendations using a normalized Executive Priority Score (0-100)
    balancing ROI, overall confidence, priority levels, and execution time horizons.
    """

    @staticmethod
    def prioritize_recommendations(
        recommendations: List[Recommendation]
    ) -> List[PrioritizedRecommendation]:
        """
        Calculates scores, ranks recommendations, and assigns priority levels.
        """
        scored_recs = []
        
        for rec in recommendations:
            roi = rec.roi
            overall_conf = rec.confidence_breakdown.overall_confidence
            priority_val = 20.0 if rec.priority == "High" else 10.0 if rec.priority == "Medium" else 0.0
            
            # Difficulty score (shorter timeline is easier -> higher score weight)
            timeline_str = str(rec.timeline).lower()
            if "30" in timeline_str or "short" in timeline_str:
                time_score = 20.0
            elif "60" in timeline_str or "medium" in timeline_str:
                time_score = 15.0
            elif "90" in timeline_str or "long" in timeline_str:
                time_score = 10.0
            else:
                time_score = 5.0

            # Calculate raw score (out of 100)
            # ROI: 30%, Confidence: 30%, Baseline Priority: 20%, Ease of Execution: 20%
            raw_score = (roi * 30.0) + (overall_conf * 30.0) + priority_val + time_score
            normalized_score = float(max(0.0, min(100.0, raw_score)))
            
            # Assign priority levels
            if normalized_score >= 70.0:
                level = "Critical"
            elif normalized_score >= 50.0:
                level = "High"
            elif normalized_score >= 30.0:
                level = "Medium"
            else:
                level = "Low"

            reason = (
                f"Ranked as {level} priority (Score: {normalized_score:.1f}) due to "
                f"estimated ROI of {roi:.1%}, implementation timeline of {rec.timeline}, "
                f"and overall statistical validation confidence of {overall_conf:.1%}."
            )

            scored_recs.append({
                "rec_id": rec.rec_id,
                "score": normalized_score,
                "level": level,
                "reason": reason
            })

        # Sort by score descending and assign rank position
        scored_recs.sort(key=lambda x: x["score"], reverse=True)
        
        prioritized_list = []
        for i, item in enumerate(scored_recs):
            prioritized_list.append(PrioritizedRecommendation(
                rec_id=item["rec_id"],
                priority_score=item["score"],
                priority_level=item["level"],
                rank_position=i + 1,
                priority_reason=item["reason"]
            ))
            
        return prioritized_list
