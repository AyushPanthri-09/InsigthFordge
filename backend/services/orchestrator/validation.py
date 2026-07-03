from backend.services.orchestrator.contracts import WorkflowContext, PipelineExecution
from backend.services.orchestrator.dependency_manager import DependencyManager
from backend.services.intelligence.memory import SharedProjectMemory

class OrchestratorValidator:
    """
    Enforces validation checks over active workflow contexts, DAG graphs,
    and checkpoint consistency indexes.
    """

    @staticmethod
    def validate_orchestrator(
        context: WorkflowContext,
        execution: PipelineExecution
    ) -> bool:
        """
        Runs complete validation rules over context and dependency structures.
        """
        # 1. Verify DAG Dependencies have no cycles
        if not DependencyManager.validate_dependencies(execution.stages):
            return False

        # 2. Check Execution Context parameters
        if not context.workflow_id or not context.dataset_id:
            return False

        # 3. Check that completed phases exist in SharedProjectMemory
        mem = SharedProjectMemory()
        for stage in context.completed_stages:
            # Check for saved output objects
            if stage == "Semantic":
                if not mem.get_metadata(context.dataset_id, "analyzed_at"):
                    return False
            elif stage == "Data Engineer":
                if not mem.get_metadata(context.dataset_id, "trusted_dataset"):
                    return False

        return True
