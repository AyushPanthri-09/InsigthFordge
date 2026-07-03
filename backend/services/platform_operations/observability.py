from backend.services.platform_operations.contracts import ObservabilityMetrics
from backend.services.intelligence.memory import SharedProjectMemory

class PlatformObservability:
    """
    Assembles observability telemetry (failed counts, latency bounds).
    """

    @staticmethod
    def get_observability(
        dataset_id: str,
        latency: float
    ) -> ObservabilityMetrics:
        """
        Gathers dashboard metrics.
        """
        mem = SharedProjectMemory()
        events = mem.get_metadata(dataset_id, "events") or []
        
        failures = sum(1 for e in events if e.get("event_type") == "WorkflowFailed")
        active = sum(1 for e in events if e.get("event_type") == "WorkflowStarted") - failures

        return ObservabilityMetrics(
            active_workflows=max(0, active),
            latency=latency,
            failed_runs=failures
        )
