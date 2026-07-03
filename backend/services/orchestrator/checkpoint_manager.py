import threading
from datetime import datetime
from typing import Optional, Dict, Any
from backend.services.orchestrator.contracts import WorkflowCheckpoint
from backend.services.intelligence.memory import SharedProjectMemory

class CheckpointManager:
    """
    Manages thread-safe workflow checkpoints, storing intermediate state
    to recover from unexpected engine disruptions.
    """
    _lock = threading.Lock()

    @staticmethod
    def save_checkpoint(dataset_id: str, stage_id: str, state_data: Dict[str, Any]):
        """Serializes and saves a stage checkpoint in project memory."""
        checkpoint = WorkflowCheckpoint(
            stage_id=stage_id,
            state_data=state_data,
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
        
        with CheckpointManager._lock:
            mem = SharedProjectMemory()
            mem.set_metadata(dataset_id, f"checkpoint_{stage_id}", checkpoint.model_dump())
            mem.set_metadata(dataset_id, "last_checkpoint", stage_id)

    @staticmethod
    def get_last_checkpoint(dataset_id: str) -> Optional[WorkflowCheckpoint]:
        """Loads the last recorded checkpoint model."""
        mem = SharedProjectMemory()
        last_stage = mem.get_metadata(dataset_id, "last_checkpoint")
        if not last_stage:
            return None
            
        data = mem.get_metadata(dataset_id, f"checkpoint_{last_stage}")
        if data:
            return WorkflowCheckpoint(**data)
        return None

    @staticmethod
    def clear_checkpoints(dataset_id: str):
        """Clears all checkpoints associated with the dataset."""
        with CheckpointManager._lock:
            mem = SharedProjectMemory()
            mem.set_metadata(dataset_id, "last_checkpoint", None)
            stages = ["Semantic", "Data Engineer", "Data Analyst", "Business Analyst", "Strategy Advisor", "Executive Communicator"]
            for stage in stages:
                mem.set_metadata(dataset_id, f"checkpoint_{stage}", None)
