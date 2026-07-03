import uuid
from typing import List, Dict, Any
from backend.services.data_analyst.contracts import AnalystResult
from backend.services.business_analyst.contracts import RootCause, ConfidenceBreakdown

class RootCauseAnalyzer:
    """
    Performs structured Root Cause Analysis (RCA) using the Five Whys framework,
    mapping observations to verified statistical metrics.
    """

    @staticmethod
    def analyze_root_causes(
        analyst_result: AnalystResult,
        dq_conf: float
    ) -> List[RootCause]:
        """
        Traces trends, segments, or anomalies down to core statistical root causes.
        """
        causes = []
        
        # Trace declining trends
        for trend in analyst_result.trends:
            if trend.direction == "decline":
                cause_id = f"rc_trend_{trend.column}_{uuid.uuid4().hex[:6]}"
                
                # Check if there are category segment failures that match this KPI
                matching_segment = None
                for seg in analyst_result.segments:
                    if seg.comparison_to_average < -0.15:
                        matching_segment = seg
                        break

                # Tracing Five Whys
                whys = [
                    f"Why 1: KPI '{trend.column}' shows a consistent decline trend.",
                    f"Why 2: Overall mean is down due to drops in chronological sequence counts."
                ]
                
                evidence = []
                counter_evidence = []
                
                if matching_segment:
                    whys.append(f"Why 3: Cohort segment '{matching_segment.segment_name}' in dimension '{matching_segment.dimension}' is underperforming by {abs(matching_segment.comparison_to_average):.1%}.")
                    whys.append(f"Why 4: Segment volume fails to sustain global metric benchmarks.")
                    whys.append(f"Why 5: Concentrated performance deficit in category '{matching_segment.segment_name}'.")
                    evidence.append(matching_segment.evidence_ids[0] if matching_segment.evidence_ids else "ev_segment")
                else:
                    whys.append("Why 3: Uniform performance contraction across all cohorts.")
                    whys.append("Why 4: General variance drop without category outliers.")
                    whys.append("Why 5: Linear decline slope fitted with high statistical significance.")

                evidence.append(trend.evidence_ids[0] if trend.evidence_ids else "ev_trend")
                
                # Check for counter-evidence: are there any segments growing?
                for seg in analyst_result.segments:
                    if seg.comparison_to_average > 0.15:
                        counter_evidence.append(f"Category '{seg.segment_name}' is growing, showing the decline is not universal.")

                observation_path = " ➔ ".join(whys)
                
                conf = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.9,
                    statistical_confidence=trend.confidence_breakdown.statistical_confidence,
                    business_confidence=trend.confidence_breakdown.business_confidence,
                    overall_confidence=dq_conf * 0.9 * trend.confidence_breakdown.statistical_confidence * trend.confidence_breakdown.business_confidence
                )

                causes.append(RootCause(
                    evidence_ids=evidence,
                    confidence_breakdown=conf,
                    reasoning_path=f"Applied Five Whys tracing on decline trend for '{trend.column}'",
                    cause_id=cause_id,
                    observation=observation_path,
                    framework_used="five_whys",
                    supporting_evidence=[trend.explanation],
                    counter_evidence=counter_evidence,
                    impact_score=abs(trend.confidence_breakdown.business_confidence)
                ))

        # Fallback if no decline causes were found
        if not causes:
            conf_fail = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=0.0,
                business_confidence=0.0,
                overall_confidence=0.0
            )
            causes.append(RootCause(
                evidence_ids=[],
                confidence_breakdown=conf_fail,
                validation_status="warning",
                limitations=["no significant decline patterns found"],
                reasoning_path="Constructed fallback RCA due to stable KPIs.",
                cause_id="rc_none_established",
                observation="No validated root cause could be established.",
                framework_used="five_whys",
                supporting_evidence=[],
                counter_evidence=[],
                impact_score=0.0
            ))

        return causes
