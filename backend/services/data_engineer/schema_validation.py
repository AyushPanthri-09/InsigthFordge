import pandas as pd
from typing import List, Dict, Any
from backend.services.data_engineer.contracts import ValidationIssue

class SchemaValidationEngine:
    """
    Validates structural database-level integrity rules.
    Verifies Primary Key unique/null status, hierarchy mappings, and functional dependencies.
    """

    @staticmethod
    def validate_schema(
        df: pd.DataFrame,
        primary_keys: List[str],
        hierarchies: List[Dict[str, Any]],
        functional_dependencies: List[Dict[str, Any]]
    ) -> List[ValidationIssue]:
        """
        Runs validation checks on keys, hierarchies, and dependencies.
        Returns a list of ValidationIssues.
        """
        issues = []
        total_rows = len(df)
        if total_rows == 0:
            return issues

        # 1. Primary Key Uniqueness & Null Validation
        if primary_keys:
            # Check for null values in primary key columns
            for pk_col in primary_keys:
                if pk_col in df.columns:
                    pk_nulls = int(df[pk_col].isnull().sum())
                    if pk_nulls > 0:
                        issues.append(ValidationIssue(
                            id=f"schema_pk_nulls_{pk_col}",
                            column=pk_col,
                            severity="critical",
                            description=f"Primary key '{pk_col}' contains {pk_nulls} null values, violating entity integrity.",
                            action="recommend_impute_or_drop"
                        ))
            
            # Check for uniqueness of primary key combinations
            pk_dups = int(df.duplicated(subset=primary_keys).sum())
            if pk_dups > 0:
                issues.append(ValidationIssue(
                    id="schema_pk_duplicate_combination",
                    column=primary_keys[0] if len(primary_keys) == 1 else None,
                    severity="critical",
                    description=f"Primary key constraint violation: Found {pk_dups} duplicate primary key combinations for keys {primary_keys}.",
                    action="recommend_deduplication"
                ))

        # 2. Hierarchy Purity Validation (Hierarchical Integrity)
        # E.g. Check if a Child value maps to multiple Parent values
        # If State -> Country is a hierarchy, check if a State belongs to multiple Countries
        for h in hierarchies:
            parent = h.get("parent")
            child = h.get("child")
            
            if parent in df.columns and child in df.columns:
                # Group by child and count unique parents
                child_grouped = df.groupby(child)[parent].nunique()
                corrupted_children = child_grouped[child_grouped > 1]
                
                if not corrupted_children.empty:
                    corrupted_child_name = str(corrupted_children.index[0])
                    issues.append(ValidationIssue(
                        id=f"schema_hierarchy_corruption_{child}_{parent}",
                        column=child,
                        severity="high",
                        description=f"Hierarchical integrity violation: Child element '{child}' ('{corrupted_child_name}') belongs to multiple parents in '{parent}'.",
                        action="recommend_hierarchy_correction"
                    ))

        # 3. Functional Dependency Violations
        # A -> B: Check if there are any rows violating this dependency
        # For a given A, all rows should have the same B.
        for fd in functional_dependencies:
            det = fd.get("determinant")
            dep = fd.get("dependent")
            
            if det in df.columns and dep in df.columns:
                # Check for instances where det determines multiple dep values
                det_grouped = df.groupby(det)[dep].nunique()
                violations = det_grouped[det_grouped > 1]
                
                if not violations.empty:
                    issues.append(ValidationIssue(
                        id=f"schema_fd_violation_{det}_{dep}",
                        column=det,
                        severity="medium",
                        description=f"Functional dependency violation ({det} -> {dep}): Found {len(violations)} determinants that map to multiple dependent values.",
                        action="recommend_dependency_fixing"
                    ))

        return issues
