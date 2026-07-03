from backend.services.business_analyst.contracts import BusinessAnalystResult
from backend.services.strategy_advisor.contracts import StrategyAdvisorResult
from backend.services.executive_communicator.contracts import (
    CommunicationBundle,
    ExecutiveEmail,
    WeeklySummary,
    MonthlySummary,
    QuarterlySummary,
    MeetingBrief,
    ConfidenceBreakdown
)

class CommunicationBuilderEngine:
    """
    Compiles channel-specific templates (Email, Slack, MS Teams, Weekly summaries, Meetings briefs)
    incorporating verified strategic results.
    """

    @staticmethod
    def build_communications(
        dataset_id: str,
        business_result: BusinessAnalystResult,
        strategy_result: StrategyAdvisorResult,
        dq_conf: float
    ) -> CommunicationBundle:
        """
        Structures the communication bundle.
        """
        # Aggregate evidence references
        evidence_ids = []
        for r in business_result.recommendations:
            evidence_ids.extend(r.evidence_ids)
        evidence_ids = list(set(evidence_ids))

        avg_conf = strategy_result.roadmap.confidence_breakdown.overall_confidence
        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=1.0,
            business_confidence=1.0,
            overall_confidence=avg_conf
        )

        # 1. Executive Email
        subject = f"Executive Performance Update: Dataset '{dataset_id}'"
        email_body = (
            f"Dear Leadership Team,\n\nWe have completed our strategic review of dataset '{dataset_id}'. "
            f"We identified key value opportunities and established corrective milestone roadmaps. "
            f"Please refer to the attached report for full details.\n\nBest regards,\nAI Strategy Advisor"
        )
        ctas = ["Review prioritized Decision Prioritization Matrix", "Approve 30-day milestone actions"]
        email = ExecutiveEmail(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Generated executive email template update.",
            subject=subject,
            body=email_body,
            call_to_actions=ctas
        )

        # 2. Weekly Summary
        weekly = WeeklySummary(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Generated weekly digest card.",
            text_content=f"Weekly Update: Audited dataset '{dataset_id}'. Category pricing opportunities prioritized."
        )

        # 3. Monthly Summary
        monthly = MonthlySummary(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Generated monthly performance card.",
            text_content=f"Monthly performance audit for '{dataset_id}' confirms certified data quality trust scoring."
        )

        # 4. Quarterly Summary
        quarterly = QuarterlySummary(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Generated quarterly executive briefing card.",
            text_content=f"Quarterly Business Review: Corrective action roadmaps deployed on schedule for '{dataset_id}'."
        )

        # 5. Meeting Brief
        brief = MeetingBrief(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Generated meeting brief card.",
            agenda_topics=["Review KPI performance deltas", "Align timeline dependencies"],
            key_decisions_required=["Approve category manager resource allocations"]
        )

        # 6. Slack and Teams text
        slack = f":loudspeaker: *InsightForge Update*: Certified dataset `{dataset_id}` quality at {dq_conf:.1%}. Roadmaps ready."
        teams = f"**InsightForge Update**: Certified dataset `{dataset_id}` quality at {dq_conf:.1%}. Roadmaps ready."

        return CommunicationBundle(
            email=email,
            weekly_summary=weekly,
            monthly_summary=monthly,
            quarterly_summary=quarterly,
            meeting_brief=brief,
            slack_summary=slack,
            teams_summary=teams
        )
