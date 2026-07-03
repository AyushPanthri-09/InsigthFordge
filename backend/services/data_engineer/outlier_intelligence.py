import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from backend.services.data_engineer.contracts import CleaningDecision

class OutlierIntelligence:
    """
    Detects outliers using statistical measures (IQR, Z-Score) and classifies them into business events.
    Prepares deferred CleaningDecisions instead of mutating data automatically.
    """

    @staticmethod
    def detect_column_outliers(series: pd.Series) -> Tuple[pd.Series, float, float, int]:
        """
        Runs IQR outlier detection.
        Returns: (boolean_mask, lower_bound, upper_bound, outliers_count)
        """
        non_null = series.dropna()
        if len(non_null) < 5 or not np.issubdtype(series.dtype, np.number):
            return pd.Series([False] * len(series)), 0.0, 0.0, 0
            
        q1 = non_null.quantile(0.25)
        q3 = non_null.quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        mask = (series < lower_bound) | (series > upper_bound)
        return mask, float(lower_bound), float(upper_bound), int(mask.sum())

    @staticmethod
    def classify_outliers(
        df: pd.DataFrame,
        col: str,
        outliers_mask: pd.Series,
        lower_bound: float,
        upper_bound: float
    ) -> Tuple[str, str, float]:
        """
        Classifies the nature of outliers (Fraud, Business Event, Promotion, Sensor Error, Data Entry Error, Legitimate).
        Returns: (classification, reasoning, confidence_score)
        """
        outlier_vals = df.loc[outliers_mask, col].dropna()
        if outlier_vals.empty:
            return "Legitimate observation", "No outlier values present.", 1.0
            
        mean_val = df[col].mean()
        std_val = df[col].std()
        
        max_val = float(outlier_vals.max())
        min_val = float(outlier_vals.min())
        col_lower = col.lower()
        
        # Calculate maximum Z-score of outliers
        max_z = abs(max_val - mean_val) / std_val if std_val > 0 else 0
        min_z = abs(min_val - mean_val) / std_val if std_val > 0 else 0
        extreme_z = max(max_z, min_z)
        
        # Heuristic 1: Extremely high Z-score (> 8) suggests data entry or sensor spikes
        if extreme_z > 8.0:
            if any(term in col_lower for term in ["temp", "volt", "sensor", "reading", "pulse"]):
                return "Sensor error", f"Extremely high Z-score ({extreme_z:.1f}) in hardware sensor column '{col}'.", 0.90
            else:
                return "Data entry error", f"Value lies {extreme_z:.1f} standard deviations from mean, suggesting typo or decimal error.", 0.85
                
        # Heuristic 2: Financial columns with high value outliers
        if any(term in col_lower for term in ["revenue", "sales", "price", "amt", "amount", "total"]):
            # Check if there is a quantity column
            qty_col = None
            for c in df.columns:
                if any(q in c.lower() for q in ["qty", "quantity", "units"]):
                    qty_col = c
                    break
                    
            if qty_col:
                # Check if rows with high price/revenue also have high quantity
                high_val_idx = df[outliers_mask].index
                high_qty_avg = df.loc[high_val_idx, qty_col].mean()
                total_qty_avg = df[qty_col].mean()
                
                if high_qty_avg > total_qty_avg * 1.5:
                    return "Promotion", f"Spikes in '{col}' correspond to increased volume in '{qty_col}' (average {high_qty_avg:.1f} vs baseline {total_qty_avg:.1f}).", 0.80
                else:
                    return "Business event", f"Large transaction observed in '{col}' without significant quantity spike.", 0.70
            else:
                return "Business event", "Large financial transaction representing high-value customers.", 0.75

        # Heuristic 3: Normal distribution tails
        return "Legitimate observation", "Values fall within standard statistical distribution tail (heavy-tailed distribution).", 0.70

    @staticmethod
    def analyze_outliers(df: pd.DataFrame) -> List[CleaningDecision]:
        """
        Scans all numeric columns, detects outliers, classifies them, and prepares deferred CleaningDecisions.
        """
        decisions = []
        for col in df.columns:
            if not np.issubdtype(df[col].dtype, np.number):
                continue
                
            mask, lower_bound, upper_bound, count = OutlierIntelligence.detect_column_outliers(df[col])
            if count == 0:
                continue

            classification, reasoning, score = OutlierIntelligence.classify_outliers(df, col, mask, lower_bound, upper_bound)
            
            # Formulate proposed actions
            action_type = "clip_outliers"
            action_desc = f"Clip {count} outlier values in '{col}' to IQR bounds [{lower_bound:.2f}, {upper_bound:.2f}]."
            risk = "low"
            
            if classification in ["Sensor error", "Data entry error"]:
                action_type = "delete_rows"
                action_desc = f"Drop {count} rows containing corrupted or invalid sensor/data spikes in '{col}'."
                risk = "medium"
            elif classification in ["Promotion", "Business event", "Legitimate observation"]:
                action_type = "keep_unchanged"
                action_desc = f"Retain outliers in '{col}' as they represent valid business anomalies."
                risk = "low"

            evidence = {
                "outliers_count": count,
                "outliers_pct": float(count / len(df)),
                "lower_bound": lower_bound,
                "upper_bound": upper_bound,
                "outlier_classification": classification,
                "classification_reasoning": reasoning
            }

            decisions.append(CleaningDecision(
                decision_id=f"decision_outlier_{col}",
                issue_id=f"issue_outlier_{col}",
                action_type=action_type,
                column=str(col),
                rationale=f"Detected {count} outliers. Classified as: {classification}. {reasoning}. Recommended action: {action_desc}",
                confidence=score,
                evidence=evidence,
                estimated_rows_affected=count,
                risk=risk,
                rollback_strategy="Restore column values from cached RollbackManager or restore dropped rows."
            ))

        return decisions
