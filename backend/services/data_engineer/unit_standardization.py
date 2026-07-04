import re
import pandas as pd
from typing import Tuple

class UnitStandardizer:
    """
    Standardizes text-based metric measurements (e.g. '10kg', '500g', '5 lbs') to standard numerical units.
    """

    @staticmethod
    def standardize_column_units(series: pd.Series, col_name: str) -> Tuple[pd.Series, int]:
        """
        Scans a column for common unit suffixes and normalizes values to a canonical base unit.
        Supported conversions:
        - Weight: g -> kg (divide by 1000), lbs -> kg (divide by 2.20462)
        - Length: cm -> m (divide by 100), inches -> cm (multiply by 2.54)
        """
        if not pd.api.types.is_object_dtype(series.dtype) and not pd.api.types.is_string_dtype(series.dtype):
            return series, 0
            
        col_lower = col_name.lower()
        cleaned = pd.Series(index=series.index, dtype="float64")
        changes = 0
        
        # Determine weight or length base
        is_weight = any(w in col_lower for w in ["weight", "mass", "load"])
        is_length = any(l in col_lower for l in ["length", "height", "width", "size", "distance"])
        
        if not (is_weight or is_length):
            return series, 0
            
        for i, val in enumerate(series):
            if pd.isna(val):
                continue
                
            val_str = str(val).strip().lower()
            
            # Match number and unit suffix
            match = re.match(r'^\s*([0-9\.]+)\s*([a-zA-Z\s]+)\s*$', val_str)
            if not match:
                continue
                
            num_val = float(match.group(1))
            unit = match.group(2).strip()
            
            standard_val = num_val
            has_changed = False
            
            if is_weight:
                if unit in ["g", "grams", "gram"]:
                    standard_val = num_val / 1000.0
                    has_changed = True
                elif unit in ["lbs", "lb", "pounds", "pound"]:
                    standard_val = num_val / 2.20462
                    has_changed = True
                elif unit in ["kg", "kilograms", "kilogram"]:
                    standard_val = num_val # already base
                    has_changed = True
            elif is_length:
                if unit in ["cm", "centimeters", "centimeter"]:
                    standard_val = num_val / 100.0
                    has_changed = True
                elif unit in ["inch", "inches", "in", '"']:
                    standard_val = num_val * 0.0254 # standard base meters
                    has_changed = True
                elif unit in ["m", "meters", "meter"]:
                    standard_val = num_val # already base
                    has_changed = True
                    
            if has_changed:
                cleaned.iloc[i] = standard_val
                changes += 1
                
        if changes > 0:
            try:
                numeric = pd.to_numeric(cleaned, errors='coerce')
                if numeric.notna().any():
                    return numeric, changes
                return cleaned, changes
            except Exception:
                return cleaned, changes
        return series, 0
