import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from backend.services.data_engineer.contracts import CleaningDecision
from backend.services.intelligence.confidence_engine import ConfidenceEngine
from backend.services.intelligence.evidence import EvidenceFactory

class MissingValueIntelligence:
    """
    Diagnoses missingness mechanisms (MCAR, MAR, MNAR) and recommends non-destructive imputation treatments.
    """

    @staticmethod
    def diagnose_missing_values(df: pd.DataFrame, col: str, col_type: str) -> Tuple[str, str, float]:
        """
        Diagnoses missingness mechanism for a column.
        Returns: (mechanism, reasoning, confidence_score)
        """
        series = df[col]
        null_count = int(series.isnull().sum())
        total_rows = len(df)
        null_pct = null_count / total_rows if total_rows > 0 else 0.0

        if null_count == 0:
            return "None", "No missing values detected.", 1.0

        # Heuristic 1: If null pct is very high (> 50%), it's likely MNAR or un-imputable
        if null_pct > 0.5:
            return "MNAR", f"Excessive missing values ({null_pct:.1%}) suggests systematic omission.", 0.85

        # Heuristic 2: Check correlation of null status with other numeric columns
        # Create null indicator
        null_indicator = series.isnull().astype(int)
        
        max_corr = 0.0
        correlated_col = ""
        
        for other_col in df.columns:
            if other_col == col:
                continue
            if pd.api.types.is_numeric_dtype(df[other_col].dtype):
                other_series = df[other_col].fillna(df[other_col].median() if df[other_col].median() else 0)
                if other_series.std() > 0:
                    corr = abs(float(null_indicator.corr(other_series)))
                    if corr > max_corr:
                        max_corr = corr
                        correlated_col = other_col

        if max_corr > 0.25:
            return "MAR", f"Missingness correlates with column '{correlated_col}' (abs corr: {max_corr:.2f}).", 0.80
        else:
            return "MCAR", "Missing values are uniformly distributed and do not correlate with observed variables.", 0.75

    @staticmethod
    def analyze_missingness(df: pd.DataFrame, col_metadata: Dict[str, Any]) -> List[CleaningDecision]:
        """
        Analyzes a dataset for missing values and prepares deferred CleaningDecisions.
        """
        decisions = []
        for col in df.columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            if null_count == 0:
                continue

            col_meta = col_metadata.get(col)
            col_type = col_meta.column_type if col_meta else "categorical"
            null_pct = null_count / len(df)

            mechanism, mechanism_reason, score = MissingValueIntelligence.diagnose_missing_values(df, col, col_type)
            
            # Formulate action details based on mechanism and data type
            action_type = "impute_nulls"
            rationale = f"Detected {null_count} missing values ({null_pct:.1%}) classified as {mechanism}. {mechanism_reason}"
            risk = "low"
            rollback_strategy = "Restore original column values from RollbackManager cache."
            
            if mechanism == "MNAR" or null_pct > 0.4:
                # High risk of imputation bias
                action_type = "drop_column"
                rationale += " Drop column recommended due to high missing ratio."
                risk = "high"
            elif col_type in ["numeric", "currency"]:
                median_val = float(series.median()) if not pd.isna(series.median()) else 0.0
                rationale += f" Recommend imputing with median value ({median_val:.2f}) to maintain distribution shape."
            elif col_type == "temporal":
                action_type = "impute_datetime"
                rationale += " Recommend forward-fill and backward-fill interpolation."
                risk = "medium"
            else:
                # Categorical / Status / Code
                mode_series = series.mode()
                mode_val = str(mode_series.iloc[0]) if not mode_series.empty else "Unknown"
                rationale += f" Recommend imputing with mode value '{mode_val}'."

            evidence = {
                "null_count": null_count,
                "null_pct": null_pct,
                "missingness_mechanism": mechanism,
                "mechanism_reasoning": mechanism_reason
            }

            decisions.append(CleaningDecision(
                decision_id=f"decision_missing_{col}",
                issue_id=f"issue_missing_{col}",
                action_type=action_type,
                column=str(col),
                rationale=rationale,
                confidence=score,
                evidence=evidence,
                estimated_rows_affected=null_count,
                risk=risk,
                rollback_strategy=rollback_strategy
            ))

        return decisions
