import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from backend.services.data_engineer.utils import string_similarity, find_similar_groups
from backend.services.data_engineer.contracts import CleaningDecision

class EntityResolver:
    """
    Performs string similarity matching and record linkage to detect double entries
    (e.g., customer or product names with slight spelling differences).
    """

    @staticmethod
    def detect_entity_duplicates(
        df: pd.DataFrame,
        column: str,
        threshold: float = 0.88
    ) -> Dict[str, Any]:
        """
        Scans a column for near-duplicate text entities and clusters them.
        """
        series = df[column].dropna().astype(str)
        groups = find_similar_groups(series.tolist(), threshold=threshold)
        
        # Calculate counts and frequencies to recommend standard replacements
        resolutions = {}
        for canonical, variants in groups.items():
            # Count occurrences of each variant to find the most common one as preferred
            variant_counts = {var: int((series == var).sum()) for var in variants}
            preferred = max(variant_counts, key=variant_counts.get)
            
            # Confidence decreases slightly with average similarity of variants
            similarities = [string_similarity(preferred, var) for var in variants if var != preferred]
            avg_similarity = float(np.mean(similarities)) if similarities else 1.0
            
            resolutions[preferred] = {
                "canonical": canonical,
                "variants": [v for v in variants if v != preferred],
                "avg_similarity": avg_similarity,
                "frequency": variant_counts[preferred],
                "affected_rows": sum(variant_counts.values())
            }
            
        return resolutions
