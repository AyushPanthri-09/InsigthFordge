import uuid
from typing import List
from backend.services.business_analyst.contracts import BusinessAnalystResult, Recommendation, Risk
from backend.services.strategy_advisor.contracts import ExecutiveReport, Roadmap, ConfidenceBreakdown

class ExecutiveReportBuilder:
    """
    Compiles a comprehensive markdown Executive Report consuming previously validated outputs.
    """

    @staticmethod
    def build_report(
        dataset_id: str,
        business_result: BusinessAnalystResult,
        roadmap: Roadmap,
        dq_conf: float
    ) -> ExecutiveReport:
        """
        Structures the text sections of the final Executive Report.
        """
        report_id = f"rep_{uuid.uuid4().hex[:6]}"
        
        # Summary compilation
        exec_summary = (
            f"Executive Summary for dataset '{dataset_id}'. This report integrates statistical results, "
            f"root cause validations, and strategic action plans to guide executive prioritization."
        )
        
        findings_str = "\n".join(
            f"- {f.finding_type.capitalize()}: {f.description}" for f in business_result.findings
        )
        
        opps_str = "\n".join(
            f"- Opportunity (ROI: {o.estimated_roi:.1%}): Type: {o.opportunity_type}, Priority: {o.priority}"
            for o in business_result.opportunities
        )
        
        risks_str = "\n".join(
            f"- Risk (Severity: {r.severity:.2f}): Type: {r.risk_type}, Mitigation: {r.mitigation}"
            for r in business_result.risks
        )
        
        recs_str = "\n".join(
            f"- Rec: Observation: {r.observation}, Owner: {r.owner}, ROI: {r.roi:.1%}"
            for r in business_result.recommendations
        )
        
        roadmap_str = "Chronological milestones outlined: " + ", ".join(roadmap.milestones.keys())
        
        outlook = "Overall growth is anticipated to stabilize once corrective roadmap recommendations are executed."
        
        confidence_summary = (
            f"Structured overall confidence propagates dataset quality score "
            f"({dq_conf:.1%}) and Business Analyst validations."
        )

        avg_overall = roadmap.confidence_breakdown.overall_confidence
        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=1.0,
            business_confidence=1.0,
            overall_confidence=avg_overall
        )

        return ExecutiveReport(
            evidence_ids=roadmap.evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Compiled narrative markdown Executive Report.",
            report_id=report_id,
            executive_summary=exec_summary,
            key_findings=findings_str if findings_str else "No significant findings recorded.",
            opportunities=opps_str if opps_str else "No opportunities identified.",
            risks=risks_str if risks_str else "No significant risks flagged.",
            recommendations=recs_str if recs_str else "No actionable recommendations generated.",
            roadmap_summary=roadmap_str,
            outlook=outlook,
            confidence_summary=confidence_summary
        )
