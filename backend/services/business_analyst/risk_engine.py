import uuid
from typing import List, Dict, Any
from backend.services.data_analyst.contracts import AnalystResult
from backend.services.data_engineer.contracts import TrustedDataset
from backend.services.business_analyst.contracts import Risk, ConfidenceBreakdown

class RiskAssessmentEngine:
    """
    Identifies and evaluates Operational, Financial, Data, Business, and Strategic risks
    based on historical volatility, quality gaps, and downward trends.
    """

    @staticmethod
    def assess_risks(
        trusted_dataset: TrustedDataset,
        analyst_result: AnalystResult,
        dq_conf: float
    ) -> List[Risk]:
        """
        Runs rules to discover data, operational, and financial risks.
        """
        risks = []
        
        # 1. Data Risk (Low Quality / High Missingness)
        trust_score = trusted_dataset.quality_report.quality_score.trust_score
        if trust_score < 80:
            risk_id = f"risk_data_quality_{uuid.uuid4().hex[:6]}"
            prob = 0.80
            imp = 0.60
            
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=1.0,
                business_confidence=0.7,
                overall_confidence=dq_conf * 0.9 * 0.7
            )
            
            risks.append(Risk(
                evidence_ids=["ev_quality_report"],
                confidence_breakdown=conf,
                reasoning_path=f"Data Quality risk flagged due to dataset trust score under 80 ({trust_score:.1f}/100)",
                risk_id=risk_id,
                risk_type="data",
                probability=prob,
                impact=imp,
                severity=prob * imp,
                mitigation="Verify all deterministic transformations and resolve missing values recommended in Cleaning Decisions.",
                owner_recommendation="Senior Data Engineer"
            ))

        # 2. Financial Risk (Decline Trend in KPI)
        for trend in analyst_result.trends:
            if trend.direction == "decline":
                risk_id = f"risk_financial_decline_{trend.column}_{uuid.uuid4().hex[:6]}"
                prob = 0.75
                imp = 0.80
                
                conf = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.9,
                    statistical_confidence=trend.confidence_breakdown.statistical_confidence,
                    business_confidence=trend.confidence_breakdown.business_confidence,
                    overall_confidence=dq_conf * 0.9 * trend.confidence_breakdown.statistical_confidence * trend.confidence_breakdown.business_confidence
                )
                
                risks.append(Risk(
                    evidence_ids=trend.evidence_ids,
                    confidence_breakdown=conf,
                    reasoning_path=f"Financial Risk flagged due to declining trend in key metric '{trend.column}'",
                    risk_id=risk_id,
                    risk_type="financial",
                    probability=prob,
                    impact=imp,
                    severity=prob * imp,
                    mitigation=f"Audit operations associated with '{trend.column}' and implement corrective actions recommended in the prioritized checklist.",
                    owner_recommendation="Finance Director"
                ))

        # Default fallback risk
        if not risks:
            conf_fail = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=0.5,
                business_confidence=0.5,
                overall_confidence=dq_conf * 0.9 * 0.25
            )
            risks.append(Risk(
                evidence_ids=[],
                confidence_breakdown=conf_fail,
                reasoning_path="Flagged default baseline risk.",
                risk_id="risk_baseline_compliance",
                risk_type="operational",
                probability=0.20,
                impact=0.30,
                severity=0.06,
                mitigation="Maintain baseline data audits and compliance monitoring.",
                owner_recommendation="Compliance Manager"
            ))

        return risks
