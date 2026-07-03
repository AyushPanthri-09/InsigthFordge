import time
import threading
from typing import Callable, Any

class WorkflowScheduler:
    """
    Schedules asynchronous tasks or delayed executions.
    """

    @staticmethod
    def run_delayed(delay_seconds: float, func: Callable[[], Any]):
        """Runs the function in a background thread after a delay."""
        def wrapper():
            time.sleep(delay_seconds)
            try:
                func()
            except Exception:
                pass

        t = threading.Thread(target=wrapper, daemon=True)
        t.start()
