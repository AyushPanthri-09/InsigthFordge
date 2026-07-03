import logging
from typing import List, Dict, Any

from backend.services.data_engineer.contracts import TrustedDataset
from backend.services.data_analyst.contracts import AnalystResult
from backend.services.business_analyst.contracts import BusinessAnalystResult
from backend.services.strategy_advisor.contracts import StrategyAdvisorResult
from backend.services.executive_communicator.contracts import (
    ExecutiveCommunicatorResult,
    ExecutiveSummary,
    DashboardNarrative,
    PresentationDeck,
    ExecutiveReport,
    CommunicationBundle
)
from backend.services.executive_communicator.executive_summary import ExecutiveSummaryBuilder
from backend.services.executive_communicator.audience_adapter import AudienceAdapterEngine
from backend.services.executive_communicator.dashboard_storytelling import DashboardStorytellingEngine
from backend.services.executive_communicator.report_builder import ReportBuilderEngine
from backend.services.executive_communicator.presentation_builder import PresentationBuilderEngine
from backend.services.executive_communicator.communication_builder import CommunicationBuilderEngine
from backend.services.executive_communicator.validation import ExecutiveValidator
from backend.services.executive_communicator.reasoning import CommunicationReasoningEngine
from backend.services.intelligence.memory import SharedProjectMemory

logger = logging.getLogger(__name__)

class AIExecutiveCommunicator:
    """
    Orchestrates the AI Executive Communicator & Autonomous Report Generation pipeline.
    """

    @staticmethod
    def generate_reports(
        dataset_id: str,
        trusted_dataset: TrustedDataset,
        analyst_result: AnalystResult,
        business_result: BusinessAnalystResult,
        strategy_result: StrategyAdvisorResult
    ) -> ExecutiveCommunicatorResult:
        """
        Coordinates full communication pipeline: executive summaries, audience adapter,
        dashboard narratives, narrative reports, presentation slides deck, and briefings.
        """
        logger.info(f"[AIExecutiveCommunicator] Starting report compilation for dataset ID: {dataset_id}")
        
        if hasattr(trusted_dataset, "quality_report"):
            dq_conf = float(trusted_dataset.quality_report.quality_score.trust_score) / 100.0
        else:
            try:
                dq_conf = float(trusted_dataset["quality_report"]["quality_score"]["trust_score"]) / 100.0
            except (KeyError, TypeError):
                dq_conf = 1.0

        # 1. Generate Executive Summary Card
        exec_summary = ExecutiveSummaryBuilder.build_summary(business_result, strategy_result, dq_conf)

        # 2. Run Audience Stakeholder Adapters (CEO, Investors, Operations, Tech)
        audience_reports = AudienceAdapterEngine.generate_audience_reports(business_result, dq_conf)

        # 3. Generate Dashboard Stories
        dashboard_narrative = DashboardStorytellingEngine.generate_narratives(business_result, strategy_result, dq_conf)

        # 4. Generate Narrative Executive Report Markdown
        report = ReportBuilderEngine.build_report(dataset_id, business_result, strategy_result, dq_conf)

        # 5. Generate Presentation Slide Deck
        presentation = PresentationBuilderEngine.build_presentation(dataset_id, business_result, strategy_result, dq_conf)

        # 6. Generate Communications Bundle (Email, Briefs, Slack/Teams digests)
        communications = CommunicationBuilderEngine.build_communications(dataset_id, business_result, strategy_result, dq_conf)

        # Compile Raw Results
        raw_result = ExecutiveCommunicatorResult(
            dataset_id=dataset_id,
            executive_summary=exec_summary,
            audience_reports=audience_reports,
            dashboard_narrative=dashboard_narrative,
            report=report,
            presentation=presentation,
            communications=communications
        )

        # 7. Run Executive Validator Gates
        final_result = ExecutiveValidator.validate_communicator_result(raw_result)

        # 8. Update Communication Reasoning Graph
        communication_graph = CommunicationReasoningEngine.build_communication_graph(final_result, dataset_id)

        # 9. Cache inside Shared Project Memory
        mem = SharedProjectMemory()
        mem.set_metadata(dataset_id, "executive_result", final_result)
        mem.set_metadata(dataset_id, "communication_reasoning_graph", communication_graph)
        
        logger.info(f"[AIExecutiveCommunicator] Finished report compilation. Validation status: {final_result.overall_validation_status}")
        
        return final_result
