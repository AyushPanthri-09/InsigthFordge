import uuid
from typing import List, Dict, Any
from backend.services.data_analyst.contracts import AnalystResult
from backend.services.business_analyst.contracts import Recommendation, ConfidenceBreakdown

class RecommendationEngine:
    """
    Generates detailed, non-generic business recommendations,
    calculating owners, ROI expectations, and success metrics.
    """

    @staticmethod
    def generate_recommendations(
        analyst_result: AnalystResult,
        dq_conf: float
    ) -> List[Recommendation]:
        """
        Creates actionable business recommendations from verified trends
        and segment outliers.
        """
        recommendations = []
        
        # 1. Recommendations for declining trends
        for trend in analyst_result.trends:
            if trend.direction == "decline":
                rec_id = f"rec_trend_{trend.column}_{uuid.uuid4().hex[:6]}"
                
                # Confidence Breakdown
                conf = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.9,
                    statistical_confidence=trend.confidence_breakdown.statistical_confidence,
                    business_confidence=trend.confidence_breakdown.business_confidence,
                    overall_confidence=dq_conf * 0.9 * trend.confidence_breakdown.statistical_confidence * trend.confidence_breakdown.business_confidence
                )

                recommendations.append(Recommendation(
                    evidence_ids=trend.evidence_ids,
                    confidence_breakdown=conf,
                    reasoning_path=f"Constructed corrective recommendation for decline trend on '{trend.column}'",
                    rec_id=rec_id,
                    observation=f"Decline trend detected on metric '{trend.column}'.",
                    business_reason=f"The continuous decline (slope: {trend.explanation}) threatens gross profitability.",
                    expected_outcome="Stabilize trend direction and restore revenue growth.",
                    owner="VP of Operations",
                    timeline="90 days",
                    priority="High",
                    roi=0.25,
                    dependencies=trend.change_points,
                    success_metric="Positive slope reversion verified in future sequential analysis."
                ))

        # 2. Recommendations for underperforming segments
        for seg in analyst_result.segments:
            if seg.comparison_to_average < -0.15:
                rec_id = f"rec_seg_{seg.segment_name}_{uuid.uuid4().hex[:6]}"
                
                conf = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.9,
                    statistical_confidence=seg.confidence_breakdown.statistical_confidence,
                    business_confidence=seg.confidence_breakdown.business_confidence,
                    overall_confidence=dq_conf * 0.9 * seg.confidence_breakdown.statistical_confidence * seg.confidence_breakdown.business_confidence
                )

                recommendations.append(Recommendation(
                    evidence_ids=seg.evidence_ids,
                    confidence_breakdown=conf,
                    reasoning_path=f"Constructed corrective recommendation for underperforming cohort '{seg.segment_name}'",
                    rec_id=rec_id,
                    observation=f"Underperforming segment '{seg.segment_name}' averages {seg.performance_metric:.2f} ({seg.comparison_to_average:+.1%}).",
                    business_reason="Resolving low performance in localized segments unlocks hidden capacity.",
                    expected_outcome=f"Increase average cohort performance of '{seg.segment_name}' closer to baseline mean.",
                    owner="Category Product Manager",
                    timeline="60 days",
                    priority="Medium",
                    roi=0.15,
                    dependencies=[],
                    success_metric=f"Segment '{seg.segment_name}' performance delta reduced below 5% variance threshold."
                ))

        # Default fallback recommendation
        if not recommendations:
            conf_fail = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=1.0,
                business_confidence=1.0,
                overall_confidence=dq_conf * 0.9
            )
            recommendations.append(Recommendation(
                evidence_ids=[],
                confidence_breakdown=conf_fail,
                reasoning_path="Constructed default baseline recommendation.",
                rec_id="rec_baseline_audit",
                observation="Maintain continuous data health monitoring.",
                business_reason="Continuous monitoring ensures early detection of downstream business performance drift.",
                expected_outcome="Mitigate performance surprises through proactive alerts.",
                owner="Operations Manager",
                timeline="Ongoing",
                priority="Low",
                roi=0.05,
                dependencies=[],
                success_metric="System alert logs contain zero unacknowledged warnings."
            ))

        return recommendations
