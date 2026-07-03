import pandas as pd
from typing import List, Dict, Any
from backend.services.data_engineer.contracts import CleaningDecision
from backend.services.data_engineer.utils import find_similar_groups

class DuplicateIntelligence:
    """
    Identifies exact row duplicates, business key duplicates, and near-duplicate entities.
    Generates CleaningDecisions for downstream deduplication.
    """

    @staticmethod
    def analyze_duplicates(
        df: pd.DataFrame,
        primary_keys: List[str],
        columns_metadata: Dict[str, Any]
    ) -> List[CleaningDecision]:
        """
        Runs duplicate detection on the dataset and returns proposed CleaningDecisions.
        """
        decisions = []
        total_rows = len(df)
        if total_rows == 0:
            return decisions

        # 1. Exact Row Duplicates
        exact_dups = int(df.duplicated().sum())
        if exact_dups > 0:
            decisions.append(CleaningDecision(
                decision_id="decision_exact_duplicates",
                issue_id="issue_exact_duplicates",
                action_type="deduplicate_rows",
                column=None,
                rationale=f"Found {exact_dups} exact duplicate rows ({exact_dups/total_rows:.1%} of dataset). Recommend removing duplicate rows to ensure statistical independence.",
                confidence=0.95,
                evidence={"duplicate_rows_count": exact_dups, "duplicate_ratio": exact_dups / total_rows},
                estimated_rows_affected=exact_dups,
                risk="low",
                rollback_strategy="Restore deleted duplicate rows from backup."
            ))

        # 2. Business Key / Primary Key Duplicates (Primary key conflicts)
        if primary_keys:
            # Check if primary keys contain duplicates
            pk_dups = int(df.duplicated(subset=primary_keys).sum())
            if pk_dups > 0:
                decisions.append(CleaningDecision(
                    decision_id="decision_key_duplicates",
                    issue_id="issue_key_duplicates",
                    action_type="deduplicate_keys",
                    column=primary_keys[0] if len(primary_keys) == 1 else None,
                    rationale=f"Primary key constraint violation: Found {pk_dups} rows with duplicate primary keys {primary_keys}. Recommend grouping or removing duplicate keys.",
                    confidence=0.90,
                    evidence={"duplicate_keys_count": pk_dups, "keys": primary_keys},
                    estimated_rows_affected=pk_dups,
                    risk="high",
                    rollback_strategy="Restore original rows with duplicate keys."
                ))

        # 3. Near-Duplicate Entities (Spelling errors / variation groups)
        # Scan categorical/string columns that are dimensions
        for col_name, meta in columns_metadata.items():
            if meta.column_type == "categorical" and meta.business_role in ["dimension", "location"]:
                # Limit scan to columns with cardinality between 5 and 200 for performance
                series = df[col_name].dropna().astype(str)
                nunique = series.nunique()
                if 5 <= nunique <= 200:
                    similar_groups = find_similar_groups(series.tolist(), threshold=0.88)
                    if similar_groups:
                        affected_rows = sum(len(grp) for grp in similar_groups.values())
                        grp_summary = {k: v for k, v in list(similar_groups.items())[:3]} # show top 3
                        
                        decisions.append(CleaningDecision(
                            decision_id=f"decision_entity_resolution_{col_name}",
                            issue_id=f"issue_entity_resolution_{col_name}",
                            action_type="merge_entities",
                            column=col_name,
                            rationale=f"Detected potential near-duplicate spellings in '{col_name}'. Found {len(similar_groups)} groups of similar terms. E.g., {grp_summary}. Recommend standardizing spellings.",
                            confidence=0.80,
                            evidence={"similar_groups": similar_groups, "groups_count": len(similar_groups)},
                            estimated_rows_affected=affected_rows,
                            risk="medium",
                            rollback_strategy="Revert string standardizations using RollbackManager."
                        ))

        return decisions
