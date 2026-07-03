import logging
import pandas as pd
from backend.services.orchestrator.contracts import OrchestratorResult
from backend.services.orchestrator.workflow_engine import WorkflowEngine

logger = logging.getLogger(__name__)

class AIOrchestrator:
    """
    AI Orchestrator & Autonomous Workflow Engine.
    Coordinates running the 6-phase analytical pipeline.
    """

    @staticmethod
    def run(
        dataset_id: str,
        df: pd.DataFrame
    ) -> OrchestratorResult:
        """
        Runs the full workflow engine from end to end.
        """
        logger.info(f"[AIOrchestrator] Starting orchestrated workflow run for dataset ID: {dataset_id}")
        return WorkflowEngine.execute_workflow(dataset_id=dataset_id, df=df)
