import pandas as pd
from typing import List, Dict
from backend.services.intelligence.contracts import Dimension, ColumnMetadata
from backend.services.intelligence.confidence_engine import ConfidenceEngine
from backend.services.intelligence.evidence import EvidenceFactory
from backend.services.intelligence.ontology import OntologyManager

class DimensionDiscoverer:
    """
    Scans columns to identify slicing and grouping business dimensions (e.g. Region, Country, Product, Date).
    """

    @staticmethod
    def discover_dimensions(df: pd.DataFrame, columns_metadata: Dict[str, ColumnMetadata]) -> List[Dimension]:
        """
        Discovers categorization and slice dimensions from dataset columns.
        """
        dimensions = []
        
        for col_name, meta in columns_metadata.items():
            # Dimensions are typically categorical, temporal, geolocation, status or code columns
            if (meta.business_role in ["dimension", "location", "status", "code"] or 
                    meta.column_type in ["categorical", "temporal", "geolocation"]):
                # Primary keys can be identifiers but also serve as dimensions if descriptive
                if meta.business_role == "key" and not ("id" in col_name.lower() or "key" in col_name.lower()):
                    pass # Keep
                elif meta.business_role == "key":
                    continue # Skip ID/keys

                norm_name = meta.detected_name
                
                # Determine dimension type
                dim_type = "categorical"
                if meta.column_type == "temporal" or "date" in col_name.lower() or "year" in col_name.lower() or "month" in col_name.lower():
                    dim_type = "temporal"
                elif "region" in col_name.lower() or "country" in col_name.lower() or "state" in col_name.lower() or "city" in col_name.lower() or "address" in col_name.lower():
                    dim_type = "spatial"

                base_score = meta.confidence.score
                reasoning = f"Column acts as a grouping dimension with type '{meta.column_type}'."
                
                # Check ontology
                concept = OntologyManager.resolve_concept(col_name)
                if concept in ["customer", "product", "location", "date", "status"]:
                    base_score = min(1.0, base_score + 0.15)
                    reasoning += f" Confirmed matching canonical ontology concept: '{concept}'."

                evidence = EvidenceFactory.create_evidence(
                    source="Profile",
                    description=f"Detected descriptive/temporal column '{col_name}' as business dimension candidate '{norm_name}'.",
                    confidence=base_score,
                    supporting_columns=[col_name],
                    supporting_statistics={
                        "concept": concept,
                        "dimension_type": dim_type,
                        "unique_count": int(df[col_name].nunique()) if col_name in df.columns else 0
                    }
                )

                confidence = ConfidenceEngine.compute_confidence(
                    score=base_score,
                    reasoning=reasoning,
                    evidence=[evidence]
                )

                dimensions.append(Dimension(
                    name=norm_name,
                    column=col_name,
                    type=dim_type,
                    confidence=confidence
                ))

        return dimensions
