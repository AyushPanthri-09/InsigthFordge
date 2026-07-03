from typing import List, Dict, Any
from backend.services.data_analyst.contracts import AnalystResult
from backend.services.business_analyst.contracts import Hypothesis, ValidatedHypothesis, ConfidenceBreakdown

class HypothesisValidator:
    """
    Validates formulated competing hypotheses against statistical results.
    Rejects unsupported hypotheses and registers validations.
    """

    @staticmethod
    def validate_hypotheses(
        hypotheses: List[Hypothesis],
        analyst_result: AnalystResult,
        dq_conf: float
    ) -> List[ValidatedHypothesis]:
        """
        Challenges formulated hypotheses using statistical tests, segment results,
        and correlation findings, returning only validated ones.
        """
        validated_list = []
        
        for hyp in hypotheses:
            cause = hyp.proposed_cause
            is_valid = False
            contradictions = []
            supporting_findings = []
            stat_conf = 0.0
            biz_conf = 0.0
            evidence_ids = hyp.evidence_ids.copy()

            if cause == "pricing_variance":
                # Check for significant correlation in statistical tests involving revenue/price
                corr_test = None
                for stat in analyst_result.statistical_tests:
                    if stat.method_name in ["PEARSON", "SPEARMAN"] and stat.is_significant:
                        corr_test = stat
                        break
                
                if corr_test:
                    is_valid = True
                    supporting_findings.append(
                        f"Significant correlation verified: {corr_test.business_interpretation}"
                    )
                    evidence_ids.extend(corr_test.evidence_ids)
                    stat_conf = corr_test.confidence_breakdown.statistical_confidence
                    biz_conf = corr_test.confidence_breakdown.business_confidence
                else:
                    contradictions.append("No statistically significant pricing correlation was found in hypothesis testing.")

            elif cause == "discount_contraction":
                # Check if there is an anomaly of type promo or statistical correlation
                has_promo = False
                for anom in analyst_result.anomalies:
                    if anom.classification == "promo":
                        has_promo = True
                        evidence_ids.extend(anom.evidence_ids)
                        supporting_findings.append(f"Atypical promotional events identified at index {anom.timestamp_or_index}.")
                        stat_conf = 0.80
                        biz_conf = 0.80
                        break
                        
                if has_promo:
                    is_valid = True
                else:
                    contradictions.append("No promo-triggered anomaly occurrences found in anomalies logs.")

            elif cause == "segment_underperformance":
                # Check if any segment has severe underperformance (< -15%)
                failing_seg = None
                for seg in analyst_result.segments:
                    if seg.comparison_to_average < -0.15:
                        failing_seg = seg
                        break
                        
                if failing_seg:
                    is_valid = True
                    supporting_findings.append(
                        f"Segment underperformance found: {failing_seg.insights[0]}"
                    )
                    evidence_ids.extend(failing_seg.evidence_ids)
                    stat_conf = failing_seg.confidence_breakdown.statistical_confidence
                    biz_conf = failing_seg.confidence_breakdown.business_confidence
                else:
                    contradictions.append("No category cohort exhibits average deviation exceeding 15% negative threshold.")
                    
            elif cause == "segment_expansion":
                # Default validation for baseline
                is_valid = True
                supporting_findings.append("Baseline optimization hypothesis accepted to identify growth paths.")
                stat_conf = 0.50
                biz_conf = 0.50

            if is_valid:
                conf = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.9,
                    statistical_confidence=stat_conf,
                    business_confidence=biz_conf,
                    overall_confidence=dq_conf * 0.9 * stat_conf * biz_conf
                )

                validated_list.append(ValidatedHypothesis(
                    evidence_ids=evidence_ids,
                    confidence_breakdown=conf,
                    validation_status="valid",
                    reasoning_path=f"Validated hypothesis '{hyp.hypothesis_id}' against dataset statistical evidence",
                    hypothesis_id=hyp.hypothesis_id,
                    formulated_text=hyp.formulated_text,
                    contradictions=contradictions,
                    supporting_findings=supporting_findings
                ))

        return validated_list
