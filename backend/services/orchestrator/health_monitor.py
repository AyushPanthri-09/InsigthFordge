import logging
from backend.services.intelligence.memory import SharedProjectMemory

logger = logging.getLogger(__name__)

class HealthMonitor:
    """
    Monitors workflow execution latency, retry frequency, and failure rates.
    """

    @staticmethod
    def evaluate_health(dataset_id: str) -> dict:
        """
        Calculates health metrics based on event logs in memory.
        """
        mem = SharedProjectMemory()
        events = mem.get_metadata(dataset_id, "events") or []
        
        failures = sum(1 for e in events if e.get("event_type") == "WorkflowFailed")
        completes = sum(1 for e in events if e.get("event_type") == "WorkflowCompleted")
        retries = sum(1 for e in events if e.get("event_type") == "RetryTriggered")
        
        status = "healthy"
        if failures > 0:
            status = "degraded"
        if failures > 3:
            status = "unhealthy"

        health = {
            "status": status,
            "total_events": len(events),
            "failures_detected": failures,
            "completions_detected": completes,
            "retry_frequency": retries
        }

        # Cache health state in memory
        mem.set_metadata(dataset_id, "health_metrics", health)
        return health
