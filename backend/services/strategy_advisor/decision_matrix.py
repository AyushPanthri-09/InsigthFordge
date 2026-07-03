import uuid
from typing import List
from backend.services.business_analyst.contracts import Recommendation, Risk
from backend.services.strategy_advisor.contracts import Decision, DecisionMatrix, ConfidenceBreakdown

class DecisionMatrixEngine:
    """
    Ranks recommendations using business impact, ROI, difficulty, and risk indices
    into a structured priority score (0-100) and execution order.
    """

    @staticmethod
    def build_matrix(
        recommendations: List[Recommendation],
        risks: List[Risk],
        dq_conf: float
    ) -> DecisionMatrix:
        """
        Builds the prioritization matrix and execution order.
        """
        decisions = []
        
        # Calculate risk deduction factor based on risk severities
        total_risk_severity = sum(r.severity for r in risks) if risks else 0.0
        risk_deduction = min(15.0, total_risk_severity * 5.0)

        scored_items = []
        for rec in recommendations:
            roi = rec.roi
            overall_conf = rec.confidence_breakdown.overall_confidence
            
            # Ease of execution score based on timeline (shorter is easier)
            timeline = str(rec.timeline).lower()
            if "30" in timeline:
                ease_score = 25.0
            elif "60" in timeline:
                ease_score = 20.0
            elif "90" in timeline:
                ease_score = 15.0
            else:
                ease_score = 10.0

            # Score calculations
            # ROI: 35%, Confidence: 35%, Ease: 30%, subtract risk
            raw_score = (roi * 35.0) + (overall_conf * 35.0) + ease_score - risk_deduction
            prio_score = float(max(0.0, min(100.0, raw_score)))
            
            if prio_score >= 70.0:
                level = "Critical"
            elif prio_score >= 50.0:
                level = "High"
            elif prio_score >= 30.0:
                level = "Medium"
            else:
                level = "Low"

            scored_items.append({
                "rec_id": rec.rec_id,
                "score": prio_score,
                "level": level,
                "evidence_ids": rec.evidence_ids,
                "conf_breakdown": rec.confidence_breakdown,
                "business_reason": rec.business_reason,
                "reasoning_path": rec.reasoning_path
            })

        # Sort and assign execution order
        scored_items.sort(key=lambda x: x["score"], reverse=True)
        
        for i, item in enumerate(scored_items):
            dec_id = f"dec_{item['rec_id']}_{uuid.uuid4().hex[:6]}"
            
            decisions.append(Decision(
                evidence_ids=item["evidence_ids"],
                confidence_breakdown=item["conf_breakdown"],
                reasoning_path=f"Strategic Decision Matrix Priority scoring. Rank position: {i+1}",
                decision_id=dec_id,
                recommendation_id=item["rec_id"],
                priority_score=item["score"],
                priority_level=item["level"],
                execution_order=i + 1,
                business_reason=item["business_reason"]
            ))
            
        return DecisionMatrix(decisions=decisions)
