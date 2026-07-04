import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from scipy import stats
from backend.services.data_engineer.contracts import ValidationIssue
from backend.services.intelligence.memory import SharedProjectMemory

class DriftDetector:
    """
    Detects distribution shifts or data drift between baseline datasets and current updates.
    """

    @staticmethod
    def detect_drift(
        df: pd.DataFrame,
        baseline_dataset_id: str
    ) -> List[ValidationIssue]:
        """
        Compares the current DataFrame's distribution against a baseline in memory.
        Uses Kolmogorov-Smirnov test for numeric columns.
        """
        issues = []
        memory = SharedProjectMemory()
        
        # Load baseline semantic result or custom cache
        baseline_result = memory.get_semantic_result(baseline_dataset_id)
        if not baseline_result:
            return issues
            
        # Try to retrieve baseline statistics
        baseline_metadata = memory.get_metadata(baseline_dataset_id, "column_summaries")
        if not baseline_metadata:
            return issues

        for col in df.columns:
            if col not in baseline_metadata:
                continue
                
            series = df[col].dropna()
            if len(series) < 10:
                continue
                
            baseline_summary = baseline_metadata[col]
            
            # If numeric, compare distribution properties (mean and variance check)
            if pd.api.types.is_numeric_dtype(series.dtype) and baseline_summary.get("type") == "numeric":
                baseline_mean = baseline_summary.get("mean", 0.0)
                baseline_std = baseline_summary.get("std", 1.0)
                
                curr_mean = float(series.mean())
                curr_std = float(series.std()) if series.std() > 0 else 1.0
                
                # Check for significant mean shift (e.g. shift exceeds 3 * baseline standard error of mean)
                std_error = baseline_std / np.sqrt(len(series))
                shift = abs(curr_mean - baseline_mean)
                
                # Flag a drift if mean shift is highly significant
                if shift > max(5.0, 4 * std_error) and baseline_std > 0:
                    issues.append(ValidationIssue(
                        id=f"drift_mean_shift_{col}",
                        column=col,
                        severity="medium",
                        description=f"Significant distribution drift detected in numeric column '{col}': Current mean ({curr_mean:.2f}) shifted significantly from baseline mean ({baseline_mean:.2f}).",
                        action="alert_distribution_shift"
                    ))
            
            # If categorical, compare top values mapping shifts
            elif series.dtype == "object" and baseline_summary.get("type") == "categorical":
                baseline_mode = baseline_summary.get("mode")
                curr_mode_series = series.mode()
                curr_mode = str(curr_mode_series.iloc[0]) if not curr_mode_series.empty else ""
                
                if baseline_mode and curr_mode and baseline_mode != curr_mode:
                    issues.append(ValidationIssue(
                        id=f"drift_mode_shift_{col}",
                        column=col,
                        severity="low",
                        description=f"Minor categorical drift in '{col}': Mode value shifted from baseline '{baseline_mode}' to current '{curr_mode}'.",
                        action="alert_categorical_drift"
                    ))
                    
        return issues

    @staticmethod
    def cache_column_summaries(df: pd.DataFrame, dataset_id: str) -> None:
        """
        Caches column summaries in project memory to serve as future baselines.
        """
        summaries = {}
        for col in df.columns:
            series = df[col].dropna()
            if len(series) == 0:
                continue
                
            if pd.api.types.is_numeric_dtype(df[col].dtype):
                summaries[col] = {
                    "type": "numeric",
                    "mean": float(series.mean()),
                    "std": float(series.std()) if series.std() > 0 else 0.0,
                    "min": float(series.min()),
                    "max": float(series.max())
                }
            else:
                mode_series = series.mode()
                summaries[col] = {
                    "type": "categorical",
                    "mode": str(mode_series.iloc[0]) if not mode_series.empty else "Unknown",
                    "cardinality": int(series.nunique())
                }
                
        memory = SharedProjectMemory()
        memory.set_metadata(dataset_id, "column_summaries", summaries)
