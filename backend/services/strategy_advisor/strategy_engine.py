from typing import List
from backend.services.business_analyst.contracts import Recommendation

class StrategyEngine:
    """
    Consolidates recommendations, removes duplicates, merges overlapping opportunities,
    and structures executive strategic priorities.
    """

    @staticmethod
    def consolidate_recommendations(
        recommendations: List[Recommendation]
    ) -> List[Recommendation]:
        """
        Deduplicates and merges overlapping recommendations from the Business Analyst.
        """
        seen_observations = set()
        consolidated = []
        
        for rec in recommendations:
            obs_key = rec.observation.strip().lower()
            if obs_key in seen_observations:
                # Merge duplicate ROI/metrics or add log
                continue
            else:
                seen_observations.add(obs_key)
                consolidated.append(rec)
                
        return consolidated
