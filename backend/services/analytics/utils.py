import numpy as np
import pandas as pd
from typing import Any
from backend.utils.exceptions import InsightForgeException

class AnalyticsException(InsightForgeException):
    """Raised when any analytics module operation fails."""
    pass

def sanitize_value(val: Any) -> Any:
    """
    Sanitizes float values (like NaN and Inf) to be JSON-compatible.
    """
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (float, np.floating)):
        if np.isinf(val) or np.isnan(val):
            return None
        return float(val)
    if isinstance(val, (int, np.integer)):
        return int(val)
    if isinstance(val, np.ndarray):
        return [sanitize_value(x) for x in val]
    return str(val)

def safe_float(val: Any, default: float = 0.0) -> float:
    """
    Safely converts a value to float, handling NaNs and errors.
    """
    try:
        if pd.isna(val) or val is None:
            return default
        fval = float(val)
        if np.isnan(fval) or np.isinf(fval):
            return default
        return fval
    except (ValueError, TypeError):
        return default

def safe_int(val: Any, default: int = 0) -> int:
    """
    Safely converts a value to int, handling NaNs and errors.
    """
    try:
        if pd.isna(val) or val is None:
            return default
        return int(round(float(val)))
    except (ValueError, TypeError):
        return default
