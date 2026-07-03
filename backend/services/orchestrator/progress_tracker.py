import threading
from typing import List
from backend.services.orchestrator.contracts import ExecutionProgress
from backend.services.intelligence.memory import SharedProjectMemory

class ProgressTracker:
    """
    Thread-safe tracker coordinating progress metrics and runtime estimates.
    """
    def __init__(self, dataset_id: str):
        self.dataset_id = dataset_id
        self._lock = threading.Lock()
        self.current_phase = "Init"
        self.overall_progress_pct = 0.0
        self.running_module = "Orchestrator"
        self.est_remaining_time = 60.0  # seconds
        self.completed_stages = []
        self.warnings = []
        self.errors = []

    def update_progress(
        self,
        phase: str,
        pct: float,
        module: str,
        est_time: float,
        completed: List[str] = None,
        warnings: List[str] = None,
        errors: List[str] = None
    ):
        """Thread-safely updates telemetry parameters and caches them in memory."""
        with self._lock:
            self.current_phase = phase
            self.overall_progress_pct = pct
            self.running_module = module
            self.est_remaining_time = est_time
            if completed:
                self.completed_stages = completed
            if warnings:
                self.warnings.extend(warnings)
            if errors:
                self.errors.extend(errors)

            progress_model = ExecutionProgress(
                current_phase=self.current_phase,
                overall_progress_pct=self.overall_progress_pct,
                running_module=self.running_module,
                est_remaining_time=self.est_remaining_time,
                completed_stages=self.completed_stages,
                warnings=self.warnings,
                errors=self.errors
            )

        mem = SharedProjectMemory()
        mem.set_metadata(self.dataset_id, "progress", progress_model.model_dump())

    def get_progress(self) -> ExecutionProgress:
        """Returns the serialized progress snapshot."""
        with self._lock:
            return ExecutionProgress(
                current_phase=self.current_phase,
                overall_progress_pct=self.overall_progress_pct,
                running_module=self.running_module,
                est_remaining_time=self.est_remaining_time,
                completed_stages=self.completed_stages,
                warnings=self.warnings,
                errors=self.errors
            )
