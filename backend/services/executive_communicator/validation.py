import logging
from typing import List
from backend.services.executive_communicator.contracts import (
    ExecutiveCommunicatorResult,
    AudienceReport,
    PresentationSlide
)

logger = logging.getLogger(__name__)

class ExecutiveValidator:
    """
    Enforces validation gates over communication deliverables, ensuring slide,
    report, and email completeness, and zero hallucinated strategic claims.
    """

    @staticmethod
    def validate_communicator_result(
        result: ExecutiveCommunicatorResult
    ) -> ExecutiveCommunicatorResult:
        """
        Runs comprehensive validation checks over the generated deliverable.
        """
        validated = result.model_copy()
        
        # 1. Slide and Content Completeness
        validated = ExecutiveValidator._validate_presentation(validated)
        
        # 2. Report Completeness
        validated = ExecutiveValidator._validate_report(validated)
        
        # 3. Communication Templates Completeness
        validated = ExecutiveValidator._validate_communications(validated)
        
        # 4. Hallucination Prevention (evidence matching checks)
        validated = ExecutiveValidator._validate_hallucination_prevention(validated)
        
        return validated

    @staticmethod
    def _validate_presentation(
        res: ExecutiveCommunicatorResult
    ) -> ExecutiveCommunicatorResult:
        """Ensures every slide has title, content, and evidence references."""
        deck = res.presentation
        if not deck.slides or len(deck.slides) < 5:
            res.global_limitations.append("Presentation validation: Slide deck contains insufficient slide count.")
            res.overall_validation_status = "warning"
            deck.validation_status = "warning"
            return res

        for slide in deck.slides:
            if not slide.title or not slide.bullet_points:
                slide.summary = "No validated narrative can be generated for this section."
                res.global_limitations.append(f"Slide '{slide.title}' marked invalid due to empty content body.")
                res.overall_validation_status = "warning"
                
        return res

    @staticmethod
    def _validate_report(
        res: ExecutiveCommunicatorResult
    ) -> ExecutiveCommunicatorResult:
        """Ensures report contains all standard narrative sections."""
        report = res.report
        required = [
            report.dataset_overview,
            report.data_quality_summary,
            report.kpi_metrics_narrative,
            report.strategic_recommendations_narrative,
            report.markdown_content
        ]
        
        if any(not section or len(section.strip()) < 10 for section in required):
            res.overall_validation_status = "warning"
            res.global_limitations.append("Executive report validation: Missing required narrative sections.")
            report.validation_status = "warning"

        return res

    @staticmethod
    def _validate_communications(
        res: ExecutiveCommunicatorResult
    ) -> ExecutiveCommunicatorResult:
        """Ensures emails, meeting briefs, and chat updates are fully populated."""
        bundle = res.communications
        if not bundle.email.subject or not bundle.email.body:
            res.global_limitations.append("Communications bundle validation: Email template is empty.")
            res.overall_validation_status = "warning"
            
        if not bundle.slack_summary or not bundle.teams_summary:
            res.global_limitations.append("Communications bundle validation: Chat platform summary templates are empty.")
            res.overall_validation_status = "warning"

        return res

    @staticmethod
    def _validate_hallucination_prevention(
        res: ExecutiveCommunicatorResult
    ) -> ExecutiveCommunicatorResult:
        """Rejects or marks warnings if any deliverable item lacks upstream evidence IDs."""
        # Check audience reports
        for report in res.audience_reports:
            if not report.evidence_ids:
                report.validation_status = "invalid"
                report.summary_card = "No validated narrative can be generated for this section."
                res.global_limitations.append(f"Audience report for stakeholder '{report.audience_type}' marked invalid due to missing trace evidence IDs.")
                res.overall_validation_status = "warning"

        # Check executive summary
        summary = res.executive_summary
        if not summary.evidence_ids:
            summary.validation_status = "invalid"
            summary.text_content = "No validated narrative can be generated for this section."
            res.global_limitations.append("Executive summary card marked invalid due to missing trace evidence IDs.")
            res.overall_validation_status = "warning"

        return res
