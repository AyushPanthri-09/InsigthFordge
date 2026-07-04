import numpy as np
import pandas as pd
from typing import List, Dict, Any
from backend.services.data_engineer.contracts import ValidationIssue

class DataEngineerValidator:
    """
    Performs structural, lexical, and type validations on raw DataFrames.
    Outputs a typed list of ValidationIssue contracts.
    """

    @staticmethod
    def validate_dataframe(df: pd.DataFrame) -> List[ValidationIssue]:
        """
        Runs full suite of structural checks and flags failures.
        """
        issues = []
        
        # 1. Check if empty
        if df.empty or len(df.columns) == 0:
            issues.append(ValidationIssue(
                id="val_empty",
                column=None,
                severity="critical",
                description="The dataset is empty (contains 0 rows or 0 columns).",
                action="reject"
            ))
            return issues

        row_count, col_count = df.shape
        columns = list(df.columns)

        # 2. Check for missing headers or default names
        unnamed_cols = [col for col in columns if "Unnamed:" in str(col)]
        if unnamed_cols:
            issues.append(ValidationIssue(
                id="val_missing_headers",
                column=unnamed_cols[0],
                severity="medium",
                description=f"Found {len(unnamed_cols)} unnamed column headers, suggesting missing or corrupt headers.",
                action="recommend_rename_headers"
            ))

        # 3. Check for duplicate columns
        str_cols = [str(c).strip() for c in columns]
        if len(str_cols) != len(set(str_cols)):
            dups = {col for col in str_cols if str_cols.count(col) > 1}
            issues.append(ValidationIssue(
                id="val_duplicate_headers",
                column=list(dups)[0] if dups else None,
                severity="critical",
                description=f"Dataset contains duplicate header columns: {list(dups)}",
                action="reject"
            ))

        # 4. Check for duplicate rows
        try:
            dup_rows_count = int(df.duplicated().sum())
            if dup_rows_count > 0:
                issues.append(ValidationIssue(
                    id="val_duplicate_rows",
                    column=None,
                    severity="medium",
                    description=f"Dataset contains {dup_rows_count} duplicate rows ({dup_rows_count / row_count:.1%} of total rows).",
                    action="recommend_deduplication"
                ))
        except Exception:
            pass

        # Column-specific diagnostics
        for col in df.columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            null_pct = null_count / row_count if row_count > 0 else 0.0

            # 5. Excessive missing values
            if null_pct > 0.4:
                issues.append(ValidationIssue(
                    id=f"val_excessive_nulls_{col}",
                    column=str(col),
                    severity="high",
                    description=f"Column '{col}' has {null_pct:.1%} missing values.",
                    action="recommend_drop_or_impute"
                ))

            # 6. Constant columns (low variance)
            non_null_series = series.dropna()
            if non_null_series.nunique() == 1:
                issues.append(ValidationIssue(
                    id=f"val_constant_col_{col}",
                    column=str(col),
                    severity="low",
                    description=f"Column '{col}' contains a constant value: '{non_null_series.iloc[0]}'.",
                    action="recommend_drop_column"
                ))

            # 7. Infinite values
            if pd.api.types.is_numeric_dtype(series.dtype):
                inf_count = int(np.isinf(series).sum())
                if inf_count > 0:
                    issues.append(ValidationIssue(
                        id=f"val_infinite_values_{col}",
                        column=str(col),
                        severity="high",
                        description=f"Column '{col}' contains {inf_count} infinite values.",
                        action="recommend_replace_inf"
                    ))

            # 8. Mixed data types
            types_in_col = {type(val) for val in non_null_series.head(100)}
            if len(types_in_col) > 1:
                issues.append(ValidationIssue(
                    id=f"val_mixed_types_{col}",
                    column=str(col),
                    severity="medium",
                    description=f"Column '{col}' contains mixed data types: {[t.__name__ for t in types_in_col]}.",
                    action="recommend_cast_types"
                ))

            # 9. Unsupported types (complex numbers)
            dtype_str = str(series.dtype)
            if "complex" in dtype_str:
                issues.append(ValidationIssue(
                    id=f"val_complex_type_{col}",
                    column=str(col),
                    severity="critical",
                    description=f"Column '{col}' has unsupported complex data type.",
                    action="recommend_drop_or_cast"
                ))

        return issues
