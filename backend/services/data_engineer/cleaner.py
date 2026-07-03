import uuid
import pandas as pd
from typing import Tuple, List, Dict, Any
from backend.services.data_engineer.contracts import CleaningAction, AuditEntry
from backend.services.intelligence.contracts import ColumnMetadata
from backend.services.data_engineer.normalization import NormalizationEngine
from backend.services.data_engineer.unit_standardization import UnitStandardizer
from backend.services.data_engineer.rollback import RollbackManager
from backend.services.data_engineer.audit import AuditTrail

class DataEngineerCleaner:
    """
    Applies only deterministic and lossless cleaning actions to a DataFrame.
    Records changes in the rollback cache and logs to the audit trail.
    """

    @staticmethod
    def clean_dataset(
        df: pd.DataFrame,
        columns_metadata: Dict[str, ColumnMetadata],
        audit_trail: AuditTrail
    ) -> Tuple[pd.DataFrame, List[CleaningAction]]:
        """
        Executes deterministic transformations: trims spaces, casts dates, formats currencies/booleans, and standardizes units.
        """
        cleaned_df = df.copy()
        cleaning_log = []
        rollback_mgr = RollbackManager()

        for col in cleaned_df.columns:
            meta = columns_metadata.get(col)
            if not meta:
                continue

            col_type = meta.column_type
            business_role = meta.business_role

            # 1. Trim Whitespace (String types)
            if cleaned_df[col].dtype == "object":
                # Backup column
                rollback_id = f"rb_trim_{col}_{uuid.uuid4().hex[:6]}"
                rollback_mgr.register_backup(rollback_id, col, cleaned_df[col])
                
                series, changes = NormalizationEngine.normalize_whitespaces(cleaned_df[col])
                if changes > 0:
                    cleaned_df[col] = series
                    action = CleaningAction(
                        action_id=f"action_trim_{col}",
                        action_type="trim_whitespace",
                        column=col,
                        description=f"Trimmed leading/trailing whitespace and collapsed multiple spaces in '{col}' (affected {changes} values).",
                        rows_affected=changes,
                        risk="low",
                        rollback_id=rollback_id
                    )
                    cleaning_log.append(action)
                    audit_trail.record_entry(
                        action="trim_whitespace",
                        reason=f"Standardize text padding in column '{col}'",
                        confidence=1.0,
                        affected_summary=f"Modified {changes} rows in '{col}'",
                        rollback_info={"rollback_id": rollback_id, "column": col}
                    )

            # 2. Normalize Booleans (Boolean type or role status)
            if col_type == "boolean" or business_role == "status":
                rollback_id = f"rb_bool_{col}_{uuid.uuid4().hex[:6]}"
                rollback_mgr.register_backup(rollback_id, col, cleaned_df[col])
                
                series, changes = NormalizationEngine.normalize_booleans(cleaned_df[col])
                if changes > 0:
                    cleaned_df[col] = series
                    action = CleaningAction(
                        action_id=f"action_bool_{col}",
                        action_type="normalize_boolean",
                        column=col,
                        description=f"Normalized binary states (y/n, 1/0, t/f) to Python booleans in '{col}' (affected {changes} values).",
                        rows_affected=changes,
                        risk="low",
                        rollback_id=rollback_id
                    )
                    cleaning_log.append(action)
                    audit_trail.record_entry(
                        action="normalize_boolean",
                        reason=f"Standardize binary representations in column '{col}'",
                        confidence=1.0,
                        affected_summary=f"Modified {changes} rows in '{col}'",
                        rollback_info={"rollback_id": rollback_id, "column": col}
                    )

            # 3. Standardize Currency symbols (Currency type or monetary names)
            if col_type == "currency" or any(term in col.lower() for term in ["price", "amt", "amount", "revenue", "cost"]):
                rollback_id = f"rb_currency_{col}_{uuid.uuid4().hex[:6]}"
                rollback_mgr.register_backup(rollback_id, col, cleaned_df[col])
                
                series, changes = NormalizationEngine.normalize_currency_symbols(cleaned_df[col])
                if changes > 0:
                    cleaned_df[col] = series
                    action = CleaningAction(
                        action_id=f"action_currency_{col}",
                        action_type="cast_currency",
                        column=col,
                        description=f"Stripped currency symbols/formatting and cast '{col}' to numeric float (affected {changes} values).",
                        rows_affected=changes,
                        risk="low",
                        rollback_id=rollback_id
                    )
                    cleaning_log.append(action)
                    audit_trail.record_entry(
                        action="cast_currency",
                        reason=f"Remove text formatting to allow numerical analysis on '{col}'",
                        confidence=1.0,
                        affected_summary=f"Cast {changes} rows to float in '{col}'",
                        rollback_info={"rollback_id": rollback_id, "column": col}
                    )

            # 4. Standardize dates (Temporal type or date role)
            if col_type == "temporal" or "date" in col.lower() or "dob" in col.lower():
                rollback_id = f"rb_date_{col}_{uuid.uuid4().hex[:6]}"
                rollback_mgr.register_backup(rollback_id, col, cleaned_df[col])
                
                series, changes = NormalizationEngine.normalize_dates(cleaned_df[col])
                if changes > 0:
                    cleaned_df[col] = series
                    action = CleaningAction(
                        action_id=f"action_date_{col}",
                        action_type="normalize_date",
                        column=col,
                        description=f"Parsed string dates to clean ISO timestamps in '{col}' (affected {changes} values).",
                        rows_affected=changes,
                        risk="low",
                        rollback_id=rollback_id
                    )
                    cleaning_log.append(action)
                    audit_trail.record_entry(
                        action="normalize_date",
                        reason=f"Align datetime formatting in column '{col}'",
                        confidence=1.0,
                        affected_summary=f"Formatted {changes} rows to datetime in '{col}'",
                        rollback_info={"rollback_id": rollback_id, "column": col}
                    )

            # 5. Standardize Capitalization
            if cleaned_df[col].dtype == "object" and col_type != "temporal":
                rollback_id = f"rb_cap_{col}_{uuid.uuid4().hex[:6]}"
                rollback_mgr.register_backup(rollback_id, col, cleaned_df[col])
                
                # Check business role to determine style
                style = "title"
                if business_role in ["code", "status"]:
                    style = "upper"
                elif "email" in col.lower():
                    style = "lower"
                    
                series, changes = NormalizationEngine.normalize_capitalization(cleaned_df[col], style=style)
                if changes > 0:
                    cleaned_df[col] = series
                    action = CleaningAction(
                        action_id=f"action_cap_{col}",
                        action_type="standardize_capitalization",
                        column=col,
                        description=f"Applied {style}-casing to column '{col}' (affected {changes} values).",
                        rows_affected=changes,
                        risk="low",
                        rollback_id=rollback_id
                    )
                    cleaning_log.append(action)
                    audit_trail.record_entry(
                        action="standardize_capitalization",
                        reason=f"Standardize case naming style '{style}' for '{col}'",
                        confidence=1.0,
                        affected_summary=f"Changed case style of {changes} rows in '{col}'",
                        rollback_info={"rollback_id": rollback_id, "column": col}
                    )

            # 6. Standardize measurement units
            if any(term in col.lower() for term in ["weight", "mass", "length", "height", "size", "distance"]):
                rollback_id = f"rb_unit_{col}_{uuid.uuid4().hex[:6]}"
                rollback_mgr.register_backup(rollback_id, col, cleaned_df[col])
                
                series, changes = UnitStandardizer.standardize_column_units(cleaned_df[col], col)
                if changes > 0:
                    cleaned_df[col] = series
                    action = CleaningAction(
                        action_id=f"action_unit_{col}",
                        action_type="standardize_units",
                        column=col,
                        description=f"Standardized weight/length metric units and cast '{col}' to float (affected {changes} values).",
                        rows_affected=changes,
                        risk="low",
                        rollback_id=rollback_id
                    )
                    cleaning_log.append(action)
                    audit_trail.record_entry(
                        action="standardize_units",
                        reason=f"Normalize metric suffixes into base standard float format for '{col}'",
                        confidence=1.0,
                        affected_summary=f"Normalized {changes} rows in '{col}'",
                        rollback_info={"rollback_id": rollback_id, "column": col}
                    )

        return cleaned_df, cleaning_log
