import uuid
from datetime import datetime
from backend.services.platform_operations.contracts import SchedulerJob

class SchedulerEngine:
    """
    Coordinates and schedules persistent hourly, daily, weekly, and monthly jobs.
    """

    @staticmethod
    def create_job(schedule_type: str) -> SchedulerJob:
        """Registers a persistent cron job schedule."""
        job_id = f"job_{uuid.uuid4().hex[:6]}"
        return SchedulerJob(
            job_id=job_id,
            schedule_type=schedule_type,
            active=True,
            last_run=datetime.utcnow().isoformat() + "Z"
        )
