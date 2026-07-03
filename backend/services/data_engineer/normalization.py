import re
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any

class NormalizationEngine:
    """
    Applies deterministic and lossless normalizations directly to the dataset.
    """

    @staticmethod
    def normalize_whitespaces(series: pd.Series) -> Tuple[pd.Series, int]:
        """
        Trims leading/trailing whitespaces and collapses multiple spaces into one.
        """
        if series.dtype != "object":
            return series, 0
            
        def clean_spaces(val):
            if not isinstance(val, str):
                return val
            return re.sub(r'\s+', ' ', val.strip())

        cleaned = series.apply(clean_spaces)
        changes = int((series != cleaned).sum())
        return cleaned, changes

    @staticmethod
    def normalize_booleans(series: pd.Series) -> Tuple[pd.Series, int]:
        """
        Standardizes typical boolean string indicators (y/n, yes/no, 1/0, t/f) to Python True/False.
        """
        if series.empty:
            return series, 0
            
        true_vals = {"1", "1.0", "true", "t", "y", "yes", "enabled", "active"}
        false_vals = {"0", "0.0", "false", "f", "n", "no", "disabled", "inactive"}
        
        def map_bool(val):
            if pd.isna(val):
                return val
            val_str = str(val).strip().lower()
            if val_str in true_vals:
                return True
            elif val_str in false_vals:
                return False
            return val
            
        cleaned = series.apply(map_bool)
        changes = 0
        for orig, new in zip(series, cleaned):
            if pd.notna(orig) and pd.notna(new):
                if orig != new or type(orig) != type(new):
                    changes += 1
        return cleaned, changes

    @staticmethod
    def normalize_dates(series: pd.Series) -> Tuple[pd.Series, int]:
        """
        Standardizes temporal/date columns into clean ISO format strings (YYYY-MM-DD) or datetime objects.
        """
        try:
            # Check if already datetime
            if pd.api.types.is_datetime64_any_dtype(series) or isinstance(series.dtype, pd.DatetimeTZDtype):
                return series, 0
                
            parsed = pd.to_datetime(series, format='mixed', errors='coerce')
            
            # Count successfully parsed datetimes that changed format
            changes = int((series.notnull() & parsed.notnull() & (series.astype(str) != parsed.dt.strftime('%Y-%m-%d'))).sum())
            return parsed, changes
        except Exception:
            return series, 0

    @staticmethod
    def normalize_capitalization(series: pd.Series, style: str = "title") -> Tuple[pd.Series, int]:
        """
        Standardizes string capitalization:
        - 'title': for descriptive names (Customer Name, City)
        - 'upper': for codes (SKU, Currency, Status, Country ISO)
        - 'lower': for emails
        """
        if series.dtype != "object":
            return series, 0
            
        def apply_style(val):
            if not isinstance(val, str):
                return val
            if style == "title":
                return val.title()
            elif style == "upper":
                return val.upper()
            elif style == "lower":
                return val.lower()
            return val

        cleaned = series.apply(apply_style)
        changes = int((series != cleaned).sum())
        return cleaned, changes

    @staticmethod
    def normalize_currency_symbols(series: pd.Series) -> Tuple[pd.Series, int]:
        """
        Strips currency signs ($, €, £), commas, and casts string monetary columns to numeric float.
        """
        if series.dtype != "object":
            return series, 0
            
        cleaned = series.copy()
        changes = 0
        
        for i, val in enumerate(series):
            if pd.isna(val):
                continue
            val_str = str(val).strip()
            # Replace common currency symbols and commas
            clean_str = re.sub(r'[\$\,\€\£\s\%\-\+]', '', val_str)
            try:
                numeric_val = float(clean_str)
                # Keep original sign if present
                if "-" in val_str:
                    numeric_val = -numeric_val
                cleaned.iloc[i] = numeric_val
                changes += 1
            except ValueError:
                pass
                
        # Cast to float series if successful
        try:
            return pd.to_numeric(cleaned, errors='ignore'), changes
        except Exception:
            return cleaned, changes
