import uuid
from typing import Dict, Any
from backend.services.platform_operations.contracts import ExperimentRecord

class ExperimentTrackerEngine:
    """
    Logs and tracks different pipeline executions, scores, and baseline configurations.
    """

    @staticmethod
    def log_experiment(
        configuration: Dict[str, Any],
        runtime: float,
        success_rate: float
    ) -> ExperimentRecord:
        """Registers a benchmark run record."""
        exp_id = f"exp_{uuid.uuid4().hex[:6]}"
        
        # Calculate proxy score based on runtime and success rate
        score = max(0.0, min(100.0, success_rate * 100.0 - (runtime * 2.0)))
        
        return ExperimentRecord(
            experiment_id=exp_id,
            configuration=configuration,
            runtime=runtime,
            benchmark_score=score,
            success_rate=success_rate
        )
