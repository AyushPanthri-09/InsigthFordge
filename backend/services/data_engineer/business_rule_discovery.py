import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from backend.services.data_engineer.contracts import ValidationIssue

class BusinessRuleDiscovery:
    """
    Infers business constraints and logic checks from column vocabularies.
    Validates rules and outputs ValidationIssues for violations.
    """

    @staticmethod
    def discover_and_validate(df: pd.DataFrame, columns_metadata: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[ValidationIssue]]:
        """
        Discovers rules and validates them on the DataFrame.
        Returns: (list of discovered rules, list of validation issues)
        """
        rules = []
        issues = []
        total_rows = len(df)
        if total_rows == 0:
            return rules, issues

        # Track columns by canonical concepts
        concept_cols = {}
        for col_name, meta in columns_metadata.items():
            concept = meta.confidence.supporting_evidence[0].supporting_statistics.get("canonical_concept") if meta.confidence.supporting_evidence else "generic"
            concept_cols.setdefault(concept, []).append(col_name)

        col_names_lower = {c.lower(): c for c in df.columns}

        # 1. Check Non-Negative Financials (Revenue, Price, Cost, Amt >= 0)
        financial_concepts = ["revenue", "cost", "profit"]
        for concept in financial_concepts:
            for col in concept_cols.get(concept, []):
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col].dtype):
                    violations = int((df[col] < 0).sum())
                    rules.append({
                        "name": f"non_negative_{col}",
                        "column": col,
                        "rule_type": "min_bound",
                        "assertion": f"{col} >= 0",
                        "violations": violations
                    })
                    if violations > 0:
                        issues.append(ValidationIssue(
                            id=f"rule_violation_non_negative_{col}",
                            column=col,
                            severity="medium",
                            description=f"Business rule violation ({col} >= 0): Found {violations} rows ({violations/total_rows:.1%}) with negative values.",
                            action="recommend_clip_or_drop"
                        ))

        # 2. Check Positive Quantity (Quantity > 0)
        for col in concept_cols.get("quantity", []):
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col].dtype):
                violations = int((df[col] <= 0).sum())
                rules.append({
                    "name": f"positive_{col}",
                    "column": col,
                    "rule_type": "min_bound",
                    "assertion": f"{col} > 0",
                    "violations": violations
                })
                if violations > 0:
                    issues.append(ValidationIssue(
                        id=f"rule_violation_positive_{col}",
                        column=col,
                        severity="medium",
                        description=f"Business rule violation ({col} > 0): Found {violations} rows ({violations/total_rows:.1%}) with zero or negative quantities.",
                        action="recommend_clip_or_drop"
                    ))

        # 3. Check Chronology (Order Date <= Ship Date, Birth Date <= Order Date)
        order_date_col = None
        ship_date_col = None
        birth_date_col = None

        for col in df.columns:
            col_l = col.lower()
            if "order" in col_l and "date" in col_l:
                order_date_col = col
            elif ("ship" in col_l or "delivery" in col_l) and "date" in col_l:
                ship_date_col = col
            elif ("birth" in col_l or "dob" in col_l) and "date" in col_l:
                birth_date_col = col

        # Validate Order Date <= Ship Date
        if order_date_col and ship_date_col:
            try:
                order_dt = pd.to_datetime(df[order_date_col], errors='coerce')
                ship_dt = pd.to_datetime(df[ship_date_col], errors='coerce')
                
                valid_mask = order_dt.notnull() & ship_dt.notnull()
                violations = int((order_dt[valid_mask] > ship_dt[valid_mask]).sum())
                
                rules.append({
                    "name": "order_before_ship",
                    "columns": [order_date_col, ship_date_col],
                    "rule_type": "chronology",
                    "assertion": f"{order_date_col} <= {ship_date_col}",
                    "violations": violations
                })
                if violations > 0:
                    issues.append(ValidationIssue(
                        id="rule_violation_chronology_order_ship",
                        column=ship_date_col,
                        severity="high",
                        description=f"Chronological violation ({order_date_col} <= {ship_date_col}): Found {violations} rows where order date occurs after ship date.",
                        action="recommend_adjust_or_drop"
                    ))
            except Exception:
                pass

        # Validate Birth Date <= Order Date
        if birth_date_col and order_date_col:
            try:
                birth_dt = pd.to_datetime(df[birth_date_col], errors='coerce')
                order_dt = pd.to_datetime(df[order_date_col], errors='coerce')
                
                valid_mask = birth_dt.notnull() & order_dt.notnull()
                violations = int((birth_dt[valid_mask] > order_dt[valid_mask]).sum())
                
                rules.append({
                    "name": "birth_before_order",
                    "columns": [birth_date_col, order_date_col],
                    "rule_type": "chronology",
                    "assertion": f"{birth_date_col} <= {order_date_col}",
                    "violations": violations
                })
                if violations > 0:
                    issues.append(ValidationIssue(
                        id="rule_violation_chronology_birth_order",
                        column=order_date_col,
                        severity="high",
                        description=f"Chronological violation ({birth_date_col} <= {order_date_col}): Found {violations} rows where birth date occurs after order date.",
                        action="recommend_adjust_or_drop"
                    ))
            except Exception:
                pass

        # 4. Check Discount <= Revenue / Price
        discount_col = None
        revenue_col = None
        for col in df.columns:
            if "discount" in col.lower():
                discount_col = col
            elif "revenue" in col.lower() or "amt" in col.lower() or "sales" in col.lower():
                revenue_col = col

        if discount_col and revenue_col:
            if pd.api.types.is_numeric_dtype(df[discount_col].dtype) and pd.api.types.is_numeric_dtype(df[revenue_col].dtype):
                violations = int((df[discount_col] > df[revenue_col]).sum())
                rules.append({
                    "name": f"discount_limit_{discount_col}",
                    "columns": [discount_col, revenue_col],
                    "rule_type": "ratio_bound",
                    "assertion": f"{discount_col} <= {revenue_col}",
                    "violations": violations
                })
                if violations > 0:
                    issues.append(ValidationIssue(
                        id="rule_violation_discount_excessive",
                        column=discount_col,
                        severity="medium",
                        description=f"Business rule violation ({discount_col} <= {revenue_col}): Found {violations} rows where discount exceeds revenue/sales value.",
                        action="recommend_cap_discount"
                    ))

        # 5. Check Age Non-Negative
        for col in df.columns:
            if "age" in col.lower() and pd.api.types.is_numeric_dtype(df[col].dtype):
                violations = int((df[col] < 0).sum())
                rules.append({
                    "name": f"age_non_negative_{col}",
                    "column": col,
                    "rule_type": "min_bound",
                    "assertion": f"{col} >= 0",
                    "violations": violations
                })
                if violations > 0:
                    issues.append(ValidationIssue(
                        id="rule_violation_age_negative",
                        column=col,
                        severity="medium",
                        description=f"Business rule violation ({col} >= 0): Found {violations} rows with negative age.",
                        action="recommend_clip_or_drop"
                    ))

        return rules, issues
