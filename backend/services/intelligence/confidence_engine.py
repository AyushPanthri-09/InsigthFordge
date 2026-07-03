from typing import List, Optional
from backend.services.intelligence.contracts import Confidence, Evidence
from backend.services.intelligence.config import CONFIDENCE_THRESHOLDS

class ConfidenceEngine:
    """
    Computes confidence metrics, classifies confidence levels, and aggregates evidence.
    """

    @staticmethod
    def compute_confidence(
        score: float,
        reasoning: str,
        validation_status: str = "valid",
        evidence: Optional[List[Evidence]] = None
    ) -> Confidence:
        """
        Classifies confidence level from numerical score and creates a Confidence object.
        """
        # Constrain score between 0.0 and 1.0
        score = max(0.0, min(1.0, score))
        
        # Classify level
        if score >= CONFIDENCE_THRESHOLDS.get("high", 0.8):
            level = "HIGH"
        elif score >= CONFIDENCE_THRESHOLDS.get("medium", 0.5):
            level = "MEDIUM"
        else:
            level = "LOW"
            
        return Confidence(
            score=score,
            level=level,
            reasoning=reasoning,
            validation_status=validation_status,
            supporting_evidence=evidence or []
        )
