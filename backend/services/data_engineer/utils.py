import difflib
import pandas as pd
from typing import List, Dict, Any

def string_similarity(s1: str, s2: str) -> float:
    """
    Computes sequence similarity ratio between two strings (0.0 to 1.0).
    """
    if not s1 or not s2:
        return 0.0
    return difflib.SequenceMatcher(None, str(s1).strip().lower(), str(s2).strip().lower()).ratio()


def find_similar_groups(values: List[str], threshold: float = 0.85) -> Dict[str, List[str]]:
    """
    Groups string values that are highly similar to each other.
    Useful for entity resolution (e.g. spelling mistakes).
    """
    groups = {}
    unique_vals = list(set(str(v).strip() for v in values if pd.notna(v) and str(v).strip()))
    
    visited = set()
    for i, v1 in enumerate(unique_vals):
        if v1 in visited:
            continue
            
        group = [v1]
        visited.add(v1)
        
        for v2 in unique_vals[i+1:]:
            if v2 not in visited:
                similarity = string_similarity(v1, v2)
                if similarity >= threshold:
                    group.append(v2)
                    visited.add(v2)
                    
        if len(group) > 1:
            # Key is the most frequent or shortest canonical label, here we take the first
            groups[v1] = group
            
    return groups
