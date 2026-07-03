import uuid
from typing import List, Dict, Any
from backend.services.data_analyst.contracts import AnalystResult
from backend.services.business_analyst.contracts import Opportunity, ConfidenceBreakdown

class OpportunityDiscoveryEngine:
    """
    Identifies and evaluates business value opportunities (revenue increase, cost reduction,
    efficiency, risk reduction) from high-performing cohorts and growth trends.
    """

    @staticmethod
    def discover_opportunities(
        analyst_result: AnalystResult,
        dq_conf: float
    ) -> List[Opportunity]:
        """
        Scans segment averages and positive trends to discover growth opportunities.
        """
        opportunities = []
        
        # 1. Scans positive segment outliers
        for seg in analyst_result.segments:
            if seg.comparison_to_average > 0.15:
                opp_id = f"opp_seg_{seg.segment_name}_{uuid.uuid4().hex[:6]}"
                
                # Estimate business metrics
                val = float(seg.performance_metric)
                roi = float(seg.comparison_to_average)
                
                conf = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.9,
                    statistical_confidence=seg.confidence_breakdown.statistical_confidence,
                    business_confidence=seg.confidence_breakdown.business_confidence,
                    overall_confidence=dq_conf * 0.9 * seg.confidence_breakdown.statistical_confidence * seg.confidence_breakdown.business_confidence
                )

                opportunities.append(Opportunity(
                    evidence_ids=seg.evidence_ids,
                    confidence_breakdown=conf,
                    reasoning_path=f"Identified growth opportunity by replicating high-performance of '{seg.segment_name}' cohort",
                    opportunity_id=opp_id,
                    opportunity_type="revenue_increase",
                    priority="high" if roi > 0.25 else "medium",
                    business_value=val,
                    estimated_roi=roi,
                    implementation_difficulty="medium" if roi > 0.20 else "low",
                    time_horizon="short"
                ))

        # 2. Scan positive trends
        for trend in analyst_result.trends:
            if trend.direction == "growth":
                opp_id = f"opp_trend_{trend.column}_{uuid.uuid4().hex[:6]}"
                
                conf = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.9,
                    statistical_confidence=trend.confidence_breakdown.statistical_confidence,
                    business_confidence=trend.confidence_breakdown.business_confidence,
                    overall_confidence=dq_conf * 0.9 * trend.confidence_breakdown.statistical_confidence * trend.confidence_breakdown.business_confidence
                )

                opportunities.append(Opportunity(
                    evidence_ids=trend.evidence_ids,
                    confidence_breakdown=conf,
                    reasoning_path=f"Identified trend opportunity by riding growth of column '{trend.column}'",
                    opportunity_id=opp_id,
                    opportunity_type="efficiency_improvement",
                    priority="high",
                    business_value=0.0,
                    estimated_roi=0.20,
                    implementation_difficulty="low",
                    time_horizon="medium"
                ))

        # Default fallback opportunity
        if not opportunities:
            conf_fail = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=0.5,
                business_confidence=0.5,
                overall_confidence=dq_conf * 0.9 * 0.25
            )
            opportunities.append(Opportunity(
                evidence_ids=[],
                confidence_breakdown=conf_fail,
                reasoning_path="Constructed default baseline growth opportunity.",
                opportunity_id="opp_baseline_expansion",
                opportunity_type="efficiency_improvement",
                priority="medium",
                business_value=1000.0,
                estimated_roi=0.10,
                implementation_difficulty="low",
                time_horizon="medium"
            ))

        return opportunities
