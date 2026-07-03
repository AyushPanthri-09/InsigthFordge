import uuid
from typing import List, Dict, Any
from backend.services.data_analyst.contracts import AnalystResult
from backend.services.business_analyst.contracts import Hypothesis, ConfidenceBreakdown

class HypothesisEngine:
    """
    Formulates multiple competing business explanations for observed trend drops 
    or KPI variance anomalies.
    """

    @staticmethod
    def generate_hypotheses(
        analyst_result: AnalystResult,
        dq_conf: float
    ) -> List[Hypothesis]:
        """
        Formulates competing hypotheses (pricing shift, promotional shift, segment drop)
        for target KPI decline vectors.
        """
        hypotheses = []
        
        for trend in analyst_result.trends:
            if trend.direction == "decline":
                col = trend.column
                evidence = trend.evidence_ids
                
                # Hypothesis 1: Pricing/Monetary shift
                h1_id = f"hyp_price_{col}_{uuid.uuid4().hex[:6]}"
                conf1 = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.9,
                    statistical_confidence=0.5, # unvalidated baseline
                    business_confidence=0.5,
                    overall_confidence=dq_conf * 0.9 * 0.25
                )
                hypotheses.append(Hypothesis(
                    evidence_ids=evidence,
                    confidence_breakdown=conf1,
                    reasoning_path=f"Formulated pricing-shift hypothesis for column '{col}'",
                    hypothesis_id=h1_id,
                    formulated_text=f"The decline in '{col}' is caused by negative correlation with pricing adjustments.",
                    tested_variable="revenue_val",
                    proposed_cause="pricing_variance"
                ))

                # Hypothesis 2: Promotional shift
                h2_id = f"hyp_promo_{col}_{uuid.uuid4().hex[:6]}"
                conf2 = conf1.model_copy()
                hypotheses.append(Hypothesis(
                    evidence_ids=evidence,
                    confidence_breakdown=conf2,
                    reasoning_path=f"Formulated promotional-shift hypothesis for column '{col}'",
                    hypothesis_id=h2_id,
                    formulated_text=f"The decline in '{col}' is caused by a contraction in promotional discount rates.",
                    tested_variable="discount_pct",
                    proposed_cause="discount_contraction"
                ))

                # Hypothesis 3: Cohort shift
                h3_id = f"hyp_cohort_{col}_{uuid.uuid4().hex[:6]}"
                conf3 = conf1.model_copy()
                hypotheses.append(Hypothesis(
                    evidence_ids=evidence,
                    confidence_breakdown=conf3,
                    reasoning_path=f"Formulated cohort-shift hypothesis for column '{col}'",
                    hypothesis_id=h3_id,
                    formulated_text=f"The decline in '{col}' is caused by localized underperformance in a specific category segment.",
                    tested_variable="category",
                    proposed_cause="segment_underperformance"
                ))

        # Default fallback hypothesis
        if not hypotheses:
            conf_fail = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=0.5,
                business_confidence=0.5,
                overall_confidence=dq_conf * 0.9 * 0.25
            )
            hypotheses.append(Hypothesis(
                evidence_ids=[],
                confidence_breakdown=conf_fail,
                reasoning_path="Formulated default baseline hypothesis.",
                hypothesis_id="hyp_baseline_growth",
                formulated_text="KPI growth is sustained by optimizing the highest-performing category segments.",
                tested_variable="overall_performance",
                proposed_cause="segment_expansion"
            ))

        return hypotheses
