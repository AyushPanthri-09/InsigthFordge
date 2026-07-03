import uuid
from typing import List, Dict, Any
from backend.services.data_analyst.contracts import (
    Insight,
    ConfidenceBreakdown,
    StatisticalResult,
    TrendResult,
    SegmentResult
)

class InsightBuilder:
    """
    Synthesizes statistical results, trend vectors, and segment cohorts
    into clear, evidence-backed, and validated business Insights.
    """

    @staticmethod
    def synthesize_insights(
        statistical_results: List[StatisticalResult],
        trend_results: List[TrendResult],
        segment_results: List[SegmentResult],
        dq_conf: float
    ) -> List[Insight]:
        """
        Loops over analytical findings and builds high-quality, Pydantic
        Insight objects with linked statistical validations.
        """
        insights = []
        
        # 1. Synthesize from significant statistical associations
        for stat in statistical_results:
            if stat.is_significant:
                ev_id = stat.evidence_ids[0] if stat.evidence_ids else "ev_generic"
                insight_id = f"ins_stat_{uuid.uuid4().hex[:6]}"
                
                finding = f"Statistically verified relationship: {stat.business_interpretation}"
                meaning = f"The association between these variables has a high likelihood of representing a real-world business coupling, rather than random noise."
                
                insights.append(Insight(
                    evidence_ids=[ev_id],
                    confidence_breakdown=stat.confidence_breakdown,
                    limitations=stat.limitations,
                    reasoning_path=f"Synthesized from hypothesis test: {stat.method_name}",
                    insight_id=insight_id,
                    finding=finding,
                    business_meaning=meaning,
                    statistical_validation=f"Significant relationship verified using {stat.method_name} test (p-value = {stat.p_value:.4f}).",
                    affected_kpis=[stat.method_name],
                    affected_segments=[],
                    related_charts=[]
                ))

        # 2. Synthesize from strong segment performance
        for seg in segment_results:
            comp_pct = abs(seg.comparison_to_average)
            if comp_pct > 0.25: # very strong deviation
                ev_id = seg.evidence_ids[0] if seg.evidence_ids else "ev_generic"
                insight_id = f"ins_seg_{uuid.uuid4().hex[:6]}"
                
                role_type = "outperforms" if seg.comparison_to_average > 0 else "underperforms"
                finding = f"Cohort '{seg.segment_name}' in dimension '{seg.dimension}' significantly {role_type} average values."
                meaning = f"This cohort represents a key driver of performance variance. Target actions should focus on magnifying positive outliers or repairing negative ones."
                
                insights.append(Insight(
                    evidence_ids=[ev_id],
                    confidence_breakdown=seg.confidence_breakdown,
                    limitations=seg.limitations,
                    reasoning_path=f"Synthesized from segment analysis for '{seg.dimension}'",
                    insight_id=insight_id,
                    finding=finding,
                    business_meaning=meaning,
                    statistical_validation=f"Segment '{seg.segment_name}' deviates from cohort average by {seg.comparison_to_average:+.1%} (performance: {seg.performance_metric:.2f}).",
                    affected_kpis=[],
                    affected_segments=[seg.segment_name],
                    related_charts=[]
                ))

        # 3. Synthesize from structural trends
        for trend in trend_results:
            if trend.direction in ["growth", "decline"]:
                ev_id = trend.evidence_ids[0] if trend.evidence_ids else "ev_generic"
                insight_id = f"ins_trend_{uuid.uuid4().hex[:6]}"
                
                finding = f"Active {trend.direction} trend detected in temporal analysis for column '{trend.column}'."
                meaning = f"The target column '{trend.column}' is moving in a consistent direction over the historical period: {trend.explanation}"
                
                insights.append(Insight(
                    evidence_ids=[ev_id],
                    confidence_breakdown=trend.confidence_breakdown,
                    limitations=trend.limitations,
                    reasoning_path=f"Synthesized from trend regression analysis",
                    insight_id=insight_id,
                    finding=finding,
                    business_meaning=meaning,
                    statistical_validation=f"Trend direction is {trend.direction} (statistically significant, seasonality period = {trend.seasonality_period}).",
                    affected_kpis=[trend.column],
                    affected_segments=[],
                    related_charts=[]
                ))

        return insights
