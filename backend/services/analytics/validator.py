import numpy as np
import pandas as pd
from typing import Dict, Any, List
from backend.services.analytics.utils import sanitize_value

class DatasetValidationEngine:
    """
    Validates structural, lexical, and semantic conditions in raw pandas DataFrames.
    Identifies quality issues, cardinality concerns, missing headers, and inconsistent formats.
    """

    @staticmethod
    def run_validation(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Runs the full validation suite against a DataFrame.
        Returns a structured validation report matching the frontend needs.
        """
        issues = []
        recommendations = []
        
        # 1. Check if empty
        if df.empty or len(df.columns) == 0:
            issues.append({
                "id": "val_empty",
                "column": None,
                "severity": "critical",
                "description": "The dataset is empty (has 0 rows or 0 columns).",
                "action": "reject"
            })
            recommendations.append("Upload a non-empty CSV/Excel file containing data rows.")
            return {
                "status": "invalid",
                "severity": "critical",
                "issues": issues,
                "recommendations": recommendations
            }
            
        row_count, col_count = df.shape
        columns = list(df.columns)
        
        # 2. Check for missing headers or default names
        unnamed_cols = [col for col in columns if "Unnamed:" in str(col)]
        if unnamed_cols:
            issues.append({
                "id": "val_missing_headers",
                "column": unnamed_cols[0],
                "severity": "warning",
                "description": f"Found {len(unnamed_cols)} unnamed column headers, suggesting missing or corrupted headers.",
                "action": "rename_headers"
            })
            recommendations.append("Add descriptive headers to the first row of your CSV/Excel sheet.")
            
        # 3. Check for duplicate columns
        str_cols = [str(c).strip() for c in columns]
        if len(str_cols) != len(set(str_cols)):
            dups = {col for col in str_cols if str_cols.count(col) > 1}
            issues.append({
                "id": "val_duplicate_headers",
                "column": list(dups)[0] if dups else None,
                "severity": "critical",
                "description": f"Dataset contains duplicate header columns: {list(dups)}",
                "action": "reject"
            })
            recommendations.append("Deduplicate column headers to prevent calculation collisions.")
            return {
                "status": "invalid",
                "severity": "critical",
                "issues": issues,
                "recommendations": recommendations
            }
            
        # 4. Check for duplicate rows
        try:
            dup_rows_count = int(df.duplicated().sum())
            if dup_rows_count > 0:
                issues.append({
                    "id": "val_duplicate_rows",
                    "column": None,
                    "severity": "warning",
                    "description": f"Dataset contains {dup_rows_count} duplicate rows ({dup_rows_count / row_count:.1%} of total rows).",
                    "action": "deduplicate_rows"
                })
                recommendations.append("Perform row deduplication to ensure statistical independence.")
        except Exception:
            pass

        # 5. Check for invalid column names (special characters or blank)
        invalid_names = []
        for col in columns:
            col_str = str(col)
            if not col_str or col_str.strip() == "" or any(c in col_str for c in ["?", "!", "#", "@", "$", "%", "^", "*", "(", ")"]):
                invalid_names.append(col_str)
        if invalid_names:
            issues.append({
                "id": "val_invalid_col_names",
                "column": invalid_names[0],
                "severity": "low",
                "description": f"Columns contain special characters or spaces that may interfere with parsing: {invalid_names[:3]}",
                "action": "normalize_names"
            })
            recommendations.append("Clean column names by removing special symbols and replacing spaces with underscores.")

        # Column-specific diagnostics
        for col in df.columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            null_pct = null_count / row_count

            # 6. Excessive missing values
            if null_pct > 0.4:
                issues.append({
                    "id": f"val_excessive_nulls_{col}",
                    "column": str(col),
                    "severity": "medium",
                    "description": f"Column '{col}' has {null_pct:.1%} missing values.",
                    "action": "drop_or_impute"
                })
                recommendations.append(
                    f"Consider dropping or imputing missing values in column '{col}'."
                )

            # 7. Constant columns (low variance)
            non_null_series = series.dropna()
            if non_null_series.nunique() == 1:
                issues.append({
                    "id": f"val_constant_col_{col}",
                    "column": str(col),
                    "severity": "low",
                    "description": f"Column '{col}' contains a constant value: {non_null_series.iloc[0]}",
                    "action": "drop_column"
                })
                recommendations.append(
                    f"Drop column '{col}' since it has no variance and provides no predictive power."
                )

            # 8. High cardinality for categorical column
            # Let's define a rough logic for detecting categorical columns
            is_object = series.dtype == "object"
            if is_object and col not in unnamed_cols:
                nunique = non_null_series.nunique()
                if nunique > 100 and len(non_null_series) > 0 and nunique / len(non_null_series) > 0.5:
                    issues.append({
                        "id": f"val_high_cardinality_{col}",
                        "column": str(col),
                        "severity": "low",
                        "description": f"Column '{col}' has high cardinality ({nunique} unique text values).",
                        "action": "flag_high_cardinality"
                    })
                    recommendations.append(
                        f"Ensure '{col}' is not a primary key or text comment before using it in models."
                    )

            # 9. Infinite values
            if pd.api.types.is_numeric_dtype(series.dtype):
                inf_count = int(np.isinf(series).sum())
                if inf_count > 0:
                    issues.append({
                        "id": f"val_infinite_values_{col}",
                        "column": str(col),
                        "severity": "medium",
                        "description": f"Column '{col}' contains {inf_count} infinite values.",
                        "action": "replace_inf"
                    })
                    recommendations.append(
                        f"Replace infinite values in column '{col}' with NaN or extreme values."
                    )

            # 10. Mixed data types
            # Check if column has mixed types (e.g. float and string)
            types_in_col = {type(val) for val in non_null_series.head(100)}
            if len(types_in_col) > 1:
                issues.append({
                    "id": f"val_mixed_types_{col}",
                    "column": str(col),
                    "severity": "medium",
                    "description": f"Column '{col}' contains mixed data types: {[t.__name__ for t in types_in_col]}",
                    "action": "cast_types"
                })
                recommendations.append(
                    f"Standardize column '{col}' to a single datatype."
                )

            # 11. Complex numbers check
            dtype_str = str(series.dtype)
            if "complex" in dtype_str:
                issues.append({
                    "id": f"val_complex_type_{col}",
                    "column": str(col),
                    "severity": "critical",
                    "description": f"Column '{col}' has unsupported complex data type.",
                    "action": "drop_or_cast"
                })
                recommendations.append(
                    f"Remove or cast complex column '{col}' to a supported datatype."
                )


        # Determine overall validation state
        crit_issues = [i for i in issues if i["severity"] in ["critical"]]
        warn_issues = [i for i in issues if i["severity"] in ["medium", "high"]]
        
        status = "valid"
        severity = "low"
        if crit_issues:
            status = "invalid"
            severity = "critical"
        elif warn_issues:
            status = "warning"
            severity = "medium"
            
        return {
            "status": status,
            "severity": severity,
            "issues": issues,
            "recommendations": recommendations
        }
