import pandas as pd
from typing import List, Dict, Any, Tuple
from itertools import combinations
from backend.services.intelligence.utils import sample_dataframe
from backend.core.logger import logger

class SchemaUnderstandingEngine:
    """
    Analyzes relational and structural properties of a dataset.
    Identifies Primary/Candidate Keys, Composite Keys, Foreign Keys,
    Hierarchies, Unique Constraints, Duplicates, and Functional Dependencies.
    """

    @staticmethod
    def analyze_schema(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Runs the full schema understanding analysis on a DataFrame.
        """
        if df.empty:
            return {
                "row_count": 0,
                "col_count": 0,
                "grain": "Empty dataset",
                "primary_keys": [],
                "candidate_keys": [],
                "foreign_keys": [],
                "relationships": [],
                "hierarchies": [],
                "unique_constraints": [],
                "duplicate_ratio": 0.0,
                "functional_dependencies": []
            }

        row_count, col_count = df.shape
        
        # Calculate Duplicates
        duplicate_count = int(df.duplicated().sum())
        duplicate_ratio = duplicate_count / row_count if row_count > 0 else 0.0

        # Sample for heavy algorithms (functional dependencies, composite keys)
        sampled_df = sample_dataframe(df, max_rows=1000)

        # Detect single-column unique constraints / candidate keys
        unique_constraints = []
        candidate_keys = []
        for col in df.columns:
            # Check non-null uniqueness
            non_null = df[col].dropna()
            if len(non_null) > 0 and non_null.nunique() == len(non_null):
                unique_constraints.append(str(col))
                # If there are no nulls, it's a solid candidate key
                if df[col].isnull().sum() == 0:
                    candidate_keys.append([str(col)])

        # Select primary key from candidate keys
        primary_keys = []
        if candidate_keys:
            # Prefer columns named 'id', 'key', or ending in '_id' or '_key'
            best_pk = None
            for key_list in candidate_keys:
                key_col = key_list[0].lower()
                if key_col == "id" or key_col == "key":
                    best_pk = key_list
                    break
                elif key_col.endswith("_id") or key_col.endswith("_key"):
                    best_pk = key_list
            if not best_pk:
                best_pk = candidate_keys[0]
            primary_keys = best_pk

        # If no single-column candidate keys, search for composite keys (pairs of columns)
        composite_keys = []
        if not candidate_keys and len(df.columns) > 1:
            non_unique_cols = [c for c in df.columns if df[c].isnull().sum() == 0]
            # Limit candidate search to top 8 columns to avoid combinatorial explosion
            for col_pair in combinations(non_unique_cols[:8], 2):
                pair_list = list(col_pair)
                # Check uniqueness on sampled df first for speed
                if sampled_df[pair_list].drop_duplicates().shape[0] == sampled_df.shape[0]:
                    # Verify on full df
                    if df[pair_list].drop_duplicates().shape[0] == row_count:
                        composite_keys.append([str(c) for c in pair_list])
                        
            candidate_keys.extend(composite_keys[:3])  # Keep top 3 composite keys

        # Detect Foreign Keys based on name patterns
        foreign_keys = []
        for col in df.columns:
            col_lower = str(col).lower()
            # If a column ends in '_id' or 'id' but is not the primary key
            if (col_lower.endswith("_id") or col_lower.endswith("id") or col_lower.endswith("_key")) and [col] != primary_keys:
                # Infer reference table
                ref_table = col_lower
                for suffix in ["_id", "id", "_key"]:
                    if ref_table.endswith(suffix):
                        ref_table = ref_table[:-len(suffix)]
                        break
                ref_table = ref_table.strip("_").capitalize()
                
                # Check foreign key null percentage
                null_pct = float(df[col].isnull().sum() / row_count)
                
                foreign_keys.append({
                    "column": str(col),
                    "referenced_entity": ref_table,
                    "referenced_column": "id",
                    "null_pct": null_pct,
                    "reasoning": f"Column name '{col}' ends with identifier suffix and is not the primary key."
                })

        # Detect Functional Dependencies (A -> B)
        functional_deps = SchemaUnderstandingEngine._detect_functional_dependencies(sampled_df)

        # Detect Natural Hierarchies (e.g. State -> City, or Category -> Subcategory)
        hierarchies = SchemaUnderstandingEngine._detect_hierarchies(df, functional_deps)

        return {
            "row_count": row_count,
            "col_count": col_count,
            "primary_keys": primary_keys,
            "candidate_keys": candidate_keys,
            "foreign_keys": foreign_keys,
            "relationships": [],
            "hierarchies": hierarchies,
            "unique_constraints": unique_constraints,
            "duplicate_ratio": duplicate_ratio,
            "functional_dependencies": functional_deps
        }

    @staticmethod
    def _detect_functional_dependencies(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Helper to scan and identify non-trivial functional dependencies: A -> B.
        A determines B if for every unique value in A, there is exactly one value in B.
        """
        dependencies = []
        cols = list(df.columns)
        
        # Limit comparison to 15 columns for performance
        cols_to_check = cols[:15]
        
        for col_a in cols_to_check:
            a_nunique = df[col_a].nunique()
            # If A has 1 or all unique values, the dependency is trivial
            if a_nunique <= 1 or a_nunique == len(df):
                continue
                
            for col_b in cols_to_check:
                if col_a == col_b:
                    continue
                    
                b_nunique = df[col_b].nunique()
                if b_nunique <= 1:
                    continue
                
                # Check if group cardinality matches
                # If for every value in A, the number of unique B values is exactly 1
                max_b_per_a = df.groupby(col_a)[col_b].nunique().max()
                if max_b_per_a == 1:
                    dependencies.append({
                        "determinant": str(col_a),
                        "dependent": str(col_b),
                        "confidence": 1.0,
                        "reasoning": f"Each unique value in '{col_a}' corresponds to exactly one unique value in '{col_b}'."
                    })
        return dependencies

    @staticmethod
    def _detect_hierarchies(df: pd.DataFrame, functional_deps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Helper to identify hierarchical relationships from functional dependencies.
        If Child -> Parent (each child has exactly 1 parent) and card(Child) > card(Parent),
        it suggests a hierarchy: Parent -> Child.
        """
        hierarchies = []
        # Index functional dependencies for quick lookup
        dep_map = {}
        for dep in functional_deps:
            det = dep["determinant"]
            dep_map.setdefault(det, []).append(dep["dependent"])

        # Scan for chains
        # E.g. A -> B and B -> C means C -> B -> A is a hierarchy (C is top parent, A is child)
        # Check cardinality: card(C) < card(B) < card(A)
        for det, dependents in dep_map.items():
            for dep in dependents:
                # Check cardinality
                det_card = df[det].nunique()
                dep_card = df[dep].nunique()
                
                if det_card > dep_card:
                    # Determinant is the child, dependent is the parent
                    hierarchies.append({
                        "parent": str(dep),
                        "child": str(det),
                        "levels": [str(dep), str(det)],
                        "reasoning": f"Natural hierarchical relationship detected where '{dep}' groups '{det}'."
                    })
                    
        return hierarchies
