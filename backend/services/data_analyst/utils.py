import difflib
import numpy as np
import pandas as pd
from typing import Any, Dict, List, Tuple

class AnalystUtils:
    """Helper utilities for statistical and string data preprocessing."""

    @staticmethod
    def calculate_similarity(s1: str, s2: str) -> float:
        """Computes Levenshtein-like SequenceMatcher ratio between two strings."""
        if not s1 or not s2:
            return 0.0
        return difflib.SequenceMatcher(None, str(s1).strip().lower(), str(s2).strip().lower()).ratio()

    @staticmethod
    def sanitize_float(val: Any, fallback: float = 0.0) -> float:
        """Converts values to float and sanitizes NaN/inf values for JSON outputs."""
        if pd.isna(val) or val is NoneValue() or val == "":
            return fallback
        try:
            f_val = float(val)
            if np.isnan(f_val) or np.isinf(f_val):
                return fallback
            return f_val
        except (ValueError, TypeError):
            return fallback

    @staticmethod
    def sanitize_dict_or_list(data: Any) -> Any:
        """Recursively sanitizes nested dictionaries or lists, converting NaNs/infs to None."""
        if isinstance(data, dict):
            return {k: AnalystUtils.sanitize_dict_or_list(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [AnalystUtils.sanitize_dict_or_list(x) for x in data]
        elif isinstance(data, float):
            if np.isnan(data) or np.isinf(data):
                return None
            return data
        elif pd.isna(data):
            return None
        return data

    @staticmethod
    def resolve_date_string(val: Any) -> str:
        """Normalizes date timestamps or pandas Timestamps to clean ISO string format (YYYY-MM-DD)."""
        if pd.isna(val) or val is None:
            return "unknown"
        if isinstance(val, (pd.Timestamp, np.datetime64)):
            return val.strftime("%Y-%m-%d")
        try:
            dt = pd.to_datetime(val)
            if pd.notna(dt):
                return dt.strftime("%Y-%m-%d")
        except Exception:
            pass
        return str(val)

class NoneValue:
    """Sentinel class representing empty/missing values."""
    pass
