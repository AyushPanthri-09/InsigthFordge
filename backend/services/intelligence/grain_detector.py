import pandas as pd
from typing import List, Dict, Tuple, Any
from backend.services.intelligence.contracts import Confidence, ColumnMetadata, BusinessEntity
from backend.services.intelligence.confidence_engine import ConfidenceEngine
from backend.services.intelligence.evidence import EvidenceFactory
from backend.services.intelligence.ontology import OntologyManager

class GrainDetector:
    """
    Detects what a single row represents in the dataset (the dataset's grain).
    """

    @staticmethod
    def detect_grain(
        df: pd.DataFrame,
        primary_keys: List[str],
        candidate_keys: List[List[str]],
        entities: List[BusinessEntity],
        columns_metadata: Dict[str, ColumnMetadata]
    ) -> Tuple[str, Confidence]:
        """
        Infers the dataset grain and returns it with a Confidence container.
        """
        row_count = len(df)
        if row_count == 0:
            evidence = EvidenceFactory.create_evidence(
                source="Heuristic",
                description="Dataset is empty, cannot accurately detect grain.",
                confidence=0.1
            )
            confidence = ConfidenceEngine.compute_confidence(
                score=0.1,
                reasoning="Empty dataset.",
                evidence=[evidence]
            )
            return "Empty Dataset Record", confidence

        grain_desc = ""
        score = 0.5
        reasoning = ""
        supporting_columns = []

        # Case 1: Single primary key
        if primary_keys and len(primary_keys) == 1:
            pk_col = primary_keys[0]
            normalized = OntologyManager.normalize_name(pk_col)
            # Remove suffix "Identifier", "Id", "Key" if present
            clean_grain = normalized
            for suffix in [" Identifier", " Id", " Key", " ID"]:
                if clean_grain.endswith(suffix):
                    clean_grain = clean_grain[:-len(suffix)]
                    break
            
            grain_desc = f"One {clean_grain.lower()}"
            score = 0.95
            reasoning = f"Single primary key '{pk_col}' uniquely identifies each row."
            supporting_columns = [pk_col]

        # Case 2: Composite keys
        elif primary_keys and len(primary_keys) > 1:
            clean_names = []
            for col in primary_keys:
                normalized = OntologyManager.normalize_name(col)
                for suffix in [" Identifier", " Id", " Key", " ID"]:
                    if normalized.endswith(suffix):
                        normalized = normalized[:-len(suffix)]
                        break
                clean_names.append(normalized.lower())
            
            # Common pattern combinations
            if "order" in clean_names and "product" in clean_names:
                grain_desc = "One order line item"
            elif "invoice" in clean_names and "product" in clean_names:
                grain_desc = "One invoice line item"
            else:
                grain_desc = f"One distinct combination of {', '.join(clean_names)}"
            
            score = 0.85
            reasoning = f"Composite primary key {primary_keys} uniquely identifies each row."
            supporting_columns = primary_keys

        # Case 3: Candidate keys (non-primary)
        elif candidate_keys:
            best_ck = candidate_keys[0]
            if len(best_ck) == 1:
                col = best_ck[0]
                normalized = OntologyManager.normalize_name(col)
                grain_desc = f"One {normalized.lower()}"
                score = 0.80
                reasoning = f"Candidate key '{col}' uniquely identifies each row."
            else:
                grain_desc = f"One combination of {best_ck}"
                score = 0.75
                reasoning = f"Composite candidate key {best_ck} uniquely identifies each row."
            supporting_columns = best_ck

        # Case 4: No unique key constraints, infer from columns
        else:
            col_names_lower = [c.lower() for c in df.columns]
            
            # Look for common transactional/event table keywords
            if any("transaction" in c or "tx" in c for c in col_names_lower):
                grain_desc = "One transaction record"
                score = 0.60
                reasoning = "Columns contain transaction/tx terms, but no unique key was found."
            elif any("claim" in c for c in col_names_lower):
                grain_desc = "One insurance claim record"
                score = 0.65
                reasoning = "Columns contain claim terms."
            elif any("sensor" in c for c in col_names_lower):
                grain_desc = "One sensor reading"
                score = 0.65
                reasoning = "Columns contain sensor terms."
            elif any("visit" in c or "patient" in c for c in col_names_lower):
                grain_desc = "One clinical/patient visit"
                score = 0.60
                reasoning = "Columns contain patient or visit terms."
            elif any("click" in c or "log" in c or "event" in c for c in col_names_lower):
                grain_desc = "One event log entry"
                score = 0.55
                reasoning = "Columns contain event, click, or log terms."
            else:
                # Look at entities
                entity_names = [e.name for e in entities]
                if "Customer" in entity_names:
                    grain_desc = "One customer transaction / event record"
                    score = 0.50
                    reasoning = "Contains customer data columns without unique key."
                else:
                    grain_desc = "One individual data record / observation"
                    score = 0.40
                    reasoning = "No unique keys or specific domain transaction markers detected."

        evidence = EvidenceFactory.create_evidence(
            source="Schema",
            description=f"Inferred dataset grain: '{grain_desc}'.",
            confidence=score,
            supporting_columns=supporting_columns,
            supporting_statistics={
                "primary_keys_count": len(primary_keys),
                "candidate_keys_count": len(candidate_keys)
            }
        )

        confidence = ConfidenceEngine.compute_confidence(
            score=score,
            reasoning=reasoning,
            evidence=[evidence]
        )

        # Capitalize first letter of grain
        grain_desc = grain_desc[0].upper() + grain_desc[1:] if grain_desc else "Unknown"

        return grain_desc, confidence
