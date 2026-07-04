import pandas as pd
import numpy as np
from typing import Dict, Any, List
from backend.services.data_engineer.contracts import ValidationIssue, CleaningDecision
from backend.services.intelligence.confidence_engine import ConfidenceEngine
from backend.services.intelligence.evidence import EvidenceFactory

class ColumnProfilerEngine:
    """
    Computes professional profiling metrics for every column in the dataset.
    """

    @staticmethod
    def calculate_entropy(series: pd.Series) -> float:
        """
        Calculates Shannon Entropy for a pandas Series.
        """
        non_null = series.dropna()
        if len(non_null) == 0:
            return 0.0
        value_counts = non_null.value_counts(normalize=True)
        return -float(np.sum(value_counts * np.log2(value_counts + 1e-12)))

    @staticmethod
    def profile_columns(
        df: pd.DataFrame,
        columns_metadata: Dict[str, Any],
        missing_decisions: List[CleaningDecision],
        outlier_decisions: List[CleaningDecision],
        rule_issues: List[ValidationIssue]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Runs comprehensive profiling for each column.
        """
        column_profile = {}
        total_rows = len(df)

        # Index missingness and outlier stats by column
        missing_map = {d.column: d for d in missing_decisions if d.column}
        outlier_map = {d.column: d for d in outlier_decisions if d.column}
        
        # Count violations by column
        violation_counts = {}
        for issue in rule_issues:
            if issue.column:
                violation_counts[issue.column] = violation_counts.get(issue.column, 0) + 1

        for col in df.columns:
            series = df[col]
            nunique = int(series.nunique())
            null_count = int(series.isnull().sum())
            null_ratio = float(null_count / total_rows) if total_rows > 0 else 0.0
            completeness = 1.0 - null_ratio

            # Range & Distribution
            col_range = None
            distribution = {}
            if pd.api.types.is_numeric_dtype(series.dtype):
                non_null_numeric = series.dropna()
                if len(non_null_numeric) > 0:
                    col_range = {
                        "min": float(non_null_numeric.min()),
                        "max": float(non_null_numeric.max())
                    }
                    distribution = {
                        "mean": float(non_null_numeric.mean()),
                        "median": float(non_null_numeric.median()),
                        "std": float(non_null_numeric.std()) if len(non_null_numeric) > 1 else 0.0
                    }
            elif pd.api.types.is_datetime64_any_dtype(series) or isinstance(series.dtype, pd.DatetimeTZDtype):
                non_null_date = series.dropna()
                if len(non_null_date) > 0:
                    col_range = {
                        "min": str(non_null_date.min()),
                        "max": str(non_null_date.max())
                    }

            # Retrieve missingness mechanism
            missing_mech = "None"
            if col in missing_map:
                missing_mech = missing_map[col].evidence.get("missingness_mechanism", "MCAR")

            # Outlier probability
            outlier_prob = 0.0
            if col in outlier_map:
                outlier_count = outlier_map[col].evidence.get("outliers_count", 0)
                outlier_prob = float(outlier_count / total_rows) if total_rows > 0 else 0.0

            # Constraint violations count
            violations = violation_counts.get(col, 0)

            # Metadata from semantic engine
            sem_meta = columns_metadata.get(col)
            bus_role = sem_meta.business_role if sem_meta else "dimension"
            col_type = sem_meta.column_type if sem_meta else "categorical"

            # Capitalization / Type Confidence
            type_confidence = 1.0
            # If mixed type issues exist for this column, lower type confidence
            mixed_issue = any(i.id == f"val_mixed_types_{col}" for i in rule_issues)
            if mixed_issue:
                type_confidence = 0.70

            # Business Importance
            importance_map = {
                "key": 0.95,
                "measure": 0.85,
                "status": 0.75,
                "code": 0.70,
                "location": 0.70,
                "dimension": 0.60
            }
            importance = importance_map.get(bus_role, 0.60)

            # Column Quality Score (0.0 to 100.0)
            # Deduct points for nulls, outliers, and violations
            col_quality_score = 100.0 - (null_ratio * 40.0) - (outlier_prob * 30.0) - (violations * 10.0)
            col_quality_score = max(0.0, min(100.0, col_quality_score))

            # Pattern Consistency (rough heuristic)
            pattern_consistency = 1.0
            if col_type == "temporal" and series.dtype == "object":
                # Check ratio of successfully parsed dates
                non_null = series.dropna()
                if len(non_null) > 0:
                    parsed_dates = pd.to_datetime(non_null, errors='coerce')
                    pattern_consistency = float(parsed_dates.notnull().sum() / len(non_null))

            evidence = EvidenceFactory.create_evidence(
                source="Profile",
                description=f"Calculated profiling statistics for column '{col}'. Quality score: {col_quality_score:.1f}.",
                confidence=col_quality_score / 100.0,
                supporting_columns=[col]
            )

            confidence = ConfidenceEngine.compute_confidence(
                score=col_quality_score / 100.0,
                reasoning=f"Column profiled with completeness {completeness:.1%}, {violations} constraint violations, and outlier probability {outlier_prob:.1%}.",
                evidence=[evidence]
            )

            column_profile[col] = {
                "completeness": completeness,
                "cardinality": nunique,
                "uniqueness": float(nunique / total_rows) if total_rows > 0 else 0.0,
                "null_ratio": null_ratio,
                "duplicate_ratio": float((total_rows - nunique) / total_rows) if total_rows > 0 else 0.0,
                "distribution": distribution,
                "entropy": ColumnProfilerEngine.calculate_entropy(series),
                "pattern_consistency": pattern_consistency,
                "type_confidence": type_confidence,
                "business_importance": importance,
                "range": col_range,
                "missing_mechanism": missing_mech,
                "constraint_violations": violations,
                "outlier_probability": outlier_prob,
                "quality_score": round(col_quality_score, 2),
                "confidence": confidence.model_dump()
            }

        return column_profile
