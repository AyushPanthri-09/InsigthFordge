import json
import logging
from backend.services.orchestrator.contracts import OrchestratorResult
from backend.services.platform_intelligence.contracts import PlatformIntelligenceResult
from backend.services.platform_intelligence.governance import GovernanceEngine
from backend.services.platform_intelligence.explainability import ExplainabilityEngine
from backend.services.platform_intelligence.audit_logger import PlatformAuditLogger
from backend.services.platform_intelligence.knowledge_base import KnowledgeBaseEngine
from backend.services.platform_intelligence.continuous_learning import ContinuousLearningEngine
from backend.services.platform_intelligence.validation import PlatformValidator
from backend.services.platform_intelligence.reasoning import SupervisorReasoningEngine
from backend.services.intelligence.memory import SharedProjectMemory

logger = logging.getLogger(__name__)

class AIPlatformSupervisor:
    """
    AI Platform Intelligence & Governance Supervisor.
    Supervises executions to guarantee explainability, trace auditing, and continuous learning.
    """

    @staticmethod
    def supervise(
        dataset_id: str,
        orchestrator_result: OrchestratorResult
    ) -> PlatformIntelligenceResult:
        """
        Coordinates full governance, audit hashing, explainability, and learning feedback.
        """
        logger.info(f"[AIPlatformSupervisor] Commencing supervisor audit for dataset ID: {dataset_id}")
        
        mem = SharedProjectMemory()
        
        # Load trusted dataset for confidence calculations
        trusted_dataset = mem.get_metadata(dataset_id, "trusted_dataset")
        dq_conf = 1.0
        if trusted_dataset:
            # Reconstruct or parse from dict
            try:
                dq_conf = float(trusted_dataset.get("quality_report", {}).get("quality_score", {}).get("trust_score", 100.0)) / 100.0
            except Exception:
                try:
                    dq_conf = float(trusted_dataset.quality_report.quality_score.trust_score) / 100.0
                except Exception:
                    pass

        # 1. Run Governance Compliance Audit
        gov_report = GovernanceEngine.audit_governance(dataset_id, orchestrator_result, dq_conf)

        # 2. Run Decision Explainability Attributions
        exp_report = ExplainabilityEngine.generate_explainability(orchestrator_result, dq_conf)

        # 3. Optimize Validation Parameters
        learning = ContinuousLearningEngine.optimize_parameters(dataset_id, dq_conf)

        # 4. Immutable Audit Logs for deliverables
        record1 = PlatformAuditLogger.log_action(
            dataset_id=dataset_id,
            action="dataset_certified",
            agent_name="AIDataEngineer",
            output_content=str(gov_report.audit_trail_hash),
            reasoning_path="Governance audit completed and cryptographic hash calculated."
        )

        records = [record1]

        # Compile Master Result
        overall_gov_score = 100.0
        if gov_report.compliance_status == "warning":
            overall_gov_score = 80.0
        elif gov_report.compliance_status == "non_compliant":
            overall_gov_score = 40.0

        raw_result = PlatformIntelligenceResult(
            dataset_id=dataset_id,
            overall_governance_score=overall_gov_score,
            explainability_report=exp_report,
            governance_report=gov_report,
            audit_records=records,
            learning_metrics=learning
        )

        # 5. Run Platform Validation Gates
        final_result = PlatformValidator.validate_platform(raw_result)

        # 6. Update Reasoning Graph
        supervisor_graph = SupervisorReasoningEngine.build_supervisor_graph(final_result)

        # 7. Cache in Shared Project Memory
        mem.set_metadata(dataset_id, "platform_result", final_result.model_dump())
        mem.set_metadata(dataset_id, "platform_reasoning_graph", supervisor_graph)
        
        logger.info(f"[AIPlatformSupervisor] Completed supervisor audit. Overall Governance Score: {overall_gov_score}%")
        
        return final_result
