import uuid
from datetime import datetime
from typing import Dict, Any, List
from backend.services.orchestrator.contracts import WorkflowContext
from backend.services.intelligence.memory import SharedProjectMemory

class ExecutionContextManager:
    """
    Manages active workflow execution state variables.
    """

    @staticmethod
    def create_context(dataset_id: str, user_id: str = None) -> WorkflowContext:
        """Initializes a new WorkflowContext."""
        workflow_id = f"wf_{uuid.uuid4().hex[:6]}"
        return WorkflowContext(
            workflow_id=workflow_id,
            dataset_id=dataset_id,
            user_id=user_id,
            start_time=datetime.utcnow().isoformat() + "Z",
            current_stage=None,
            completed_stages=[],
            failed_stage=None,
            execution_status="running",
            warnings=[],
            errors=[],
            memory_keys=[],
            resource_usage={},
            timings={}
        )

    @staticmethod
    def save_context(context: WorkflowContext):
        """Saves context inside SharedProjectMemory."""
        mem = SharedProjectMemory()
        mem.set_metadata(context.dataset_id, "workflow_context", context.model_dump())
