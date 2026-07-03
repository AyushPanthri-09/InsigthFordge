import logging
from backend.services.orchestrator.contracts import ExecutionHistory, WorkflowContext
from backend.services.intelligence.memory import SharedProjectMemory

logger = logging.getLogger(__name__)

class ExecutionHistoryManager:
    """
    Maintains historical audit trail logs for execution context parameters.
    """

    @staticmethod
    def record_execution(
        context: WorkflowContext,
        generated_artifacts: list,
        checkpoint_history: list
    ):
        """Compiles and stores execution metrics history in memory."""
        history = ExecutionHistory(
            workflow_id=context.workflow_id,
            dataset_id=context.dataset_id,
            timestamps={"start": context.start_time},
            durations=context.timings,
            warnings=context.warnings,
            errors=context.errors,
            generated_artifacts=generated_artifacts,
            resource_metrics=context.resource_usage,
            completed_stages=context.completed_stages,
            checkpoint_history=checkpoint_history
        )

        mem = SharedProjectMemory()
        history_list = mem.get_metadata(context.dataset_id, "workflow_history") or []
        history_list.append(history.model_dump())
        mem.set_metadata(context.dataset_id, "workflow_history", history_list)
        logger.info(f"[ExecutionHistory] Logged historical audit run: {context.workflow_id}")
