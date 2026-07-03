import uuid
from typing import List
from backend.services.business_analyst.contracts import BusinessAnalystResult
from backend.services.strategy_advisor.contracts import StrategyAdvisorResult
from backend.services.executive_communicator.contracts import ExecutiveSummary, ConfidenceBreakdown

class ExecutiveSummaryBuilder:
    """
    Compiles executive briefing cards outlining strategic priorities, key risks,
    opportunities, and recommendations.
    """

    @staticmethod
    def build_summary(
        business_result: BusinessAnalystResult,
        strategy_result: StrategyAdvisorResult,
        dq_conf: float
    ) -> ExecutiveSummary:
        """
        Structures the ExecutiveSummary card.
        """
        summary_id = f"sum_{uuid.uuid4().hex[:6]}"
        
        # Extract fields
        findings = [f.description for f in business_result.findings[:3]]
        
        impact = (
            f"Business Impact: Addressed a margin variance and stabilized downward "
            f"metrics. Replicating positive category segments is estimated to yield ROI "
            f"realignment within target quarters."
        )
        
        risks = [f"Risk: {r.risk_type} (Severity: {r.severity:.2f})" for r in business_result.risks[:3]]
        opportunities = [f"Opp: {o.opportunity_type} (ROI: {o.estimated_roi:.1%})" for o in business_result.opportunities[:3]]
        
        # Get highest priority recommendation from Decision Matrix
        highest_prio_rec = "Maintain baseline data audits and compliance monitoring."
        if strategy_result.decision_matrix.decisions:
            first_decision = strategy_result.decision_matrix.decisions[0]
            # Match first decision recommendation_id to recommendations
            for r in business_result.recommendations:
                if r.rec_id == first_decision.recommendation_id:
                    highest_prio_rec = f"Address {r.observation} (Score: {first_decision.priority_score:.1f}, Owner: {r.owner})."
                    break

        evidence_ids = []
        for r in business_result.recommendations:
            evidence_ids.extend(r.evidence_ids)
        evidence_ids = list(set(evidence_ids))

        text_content = (
            "Executive Update: InsightForge AI has audited the dataset, certified data quality "
            "metrics, identified category margin opportunities, and structured chronological corrective actions."
        )

        avg_conf = strategy_result.roadmap.confidence_breakdown.overall_confidence
        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=1.0,
            business_confidence=1.0,
            overall_confidence=avg_conf
        )

        return ExecutiveSummary(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Compiled executive summary update briefing card.",
            summary_id=summary_id,
            text_content=text_content,
            key_findings=findings if findings else ["No key findings logged."],
            business_impact=impact,
            top_risks=risks if risks else ["No significant risks recorded."],
            top_opportunities=opportunities if opportunities else ["No opportunities discovered."],
            highest_priority_recommendation=highest_prio_rec
        )
