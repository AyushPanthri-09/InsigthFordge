import time
import logging
from typing import Callable, Any

logger = logging.getLogger(__name__)

class RetryManager:
    """
    Executes stages with retry logic, handling errors with configurable backoffs.
    """
    
    @staticmethod
    def execute_with_retry(
        func: Callable[[], Any],
        max_retries: int = 3,
        retry_delay: float = 0.5,
        backoff_multiplier: float = 2.0,
        stage_name: str = "Stage"
    ) -> Any:
        """
        Executes a callable with retries, logging telemetry updates.
        """
        retries = 0
        current_delay = retry_delay
        
        while True:
            try:
                return func()
            except (ValueError, RuntimeError, TimeoutError, MemoryError, IOError) as e:
                retries += 1
                if retries > max_retries:
                    logger.error(f"[RetryManager] Stage '{stage_name}' failed after {max_retries} retries: {str(e)}")
                    raise e
                
                logger.warning(
                    f"[RetryManager] Stage '{stage_name}' failed with {type(e).__name__}. "
                    f"Retry {retries}/{max_retries} in {current_delay:.2f} seconds..."
                )
                time.sleep(current_delay)
                current_delay *= backoff_multiplier
