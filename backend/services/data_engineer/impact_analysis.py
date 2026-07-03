import pandas as pd
from typing import Dict, Any, Tuple, Optional

class ImpactAnalyzer:
    """
    Evaluates the scope of modifications (rows/columns affected) and estimates operational risk.
    """

    @staticmethod
    def estimate_normalization_impact(
        df: pd.DataFrame,
        col: str,
        changes_count: int
    ) -> Tuple[int, str]:
        """
        Estimates the rows affected and risk of a deterministic normalization.
        """
        risk = "low"
        # Normalizations are safe. If changes affect > 90% of rows, it's a structural update, still low risk.
        return changes_count, risk

    @staticmethod
    def estimate_destructive_impact(
        df: pd.DataFrame,
        col: Optional[str],
        action_type: str,
        estimated_affected: int
    ) -> Tuple[int, str]:
        """
        Estimates the rows affected and risk of a potentially destructive cleaning repair.
        """
        total_rows = len(df)
        if total_rows == 0:
            return 0, "low"
            
        ratio = estimated_affected / total_rows
        
        # Risk classification based on ratio and action type
        if action_type in ["delete_rows", "drop_column"]:
            if ratio > 0.15:
                risk = "high"
            else:
                risk = "medium"
        elif action_type in ["merge_duplicates", "merge_entities"]:
            if ratio > 0.20:
                risk = "medium"
            else:
                risk = "low"
        else:
            # Imputations
            if ratio > 0.30:
                risk = "medium"
            else:
                risk = "low"
                
        return estimated_affected, risk
