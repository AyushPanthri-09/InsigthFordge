import time
import pandas as pd
from typing import Callable, Any, Tuple
from functools import wraps
from backend.core.logger import logger

def execution_timer(func_name: str = "") -> Callable:
    """
    Decorator to log execution time of functions for performance monitoring.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            start_time = time.perf_counter()
            name = func_name or func.__name__
            try:
                result = func(*args, **kwargs)
                elapsed = time.perf_counter() - start_time
                logger.info(f"[Timer] {name} completed in {elapsed:.4f} seconds.")
                return result
            except Exception as e:
                elapsed = time.perf_counter() - start_time
                logger.error(f"[Timer] {name} failed after {elapsed:.4f} seconds with error: {str(e)}")
                raise
        return wrapper
    return decorator


def sample_dataframe(df: pd.DataFrame, max_rows: int = 1000) -> pd.DataFrame:
    """
    Samples a DataFrame if it exceeds a specified row limit to optimize heavy computation steps.
    """
    if len(df) <= max_rows:
        return df
    # Sample randomly but keep random state reproducible
    return df.sample(n=max_rows, random_state=42)


def clean_string_for_comparison(s: str) -> str:
    """
    Strips special characters and whitespaces, returns lowercase version.
    """
    if not isinstance(s, str):
        return ""
    import re
    return re.sub(r'[^a-zA-Z0-9]+', '', s).lower()
