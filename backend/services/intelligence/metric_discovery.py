import pandas as pd
from typing import List, Dict
from backend.services.intelligence.contracts import Metric, ColumnMetadata
from backend.services.intelligence.confidence_engine import ConfidenceEngine
from backend.services.intelligence.evidence import EvidenceFactory
from backend.services.intelligence.ontology import OntologyManager

class MetricDiscoverer:
    """
    Scans columns to identify quantitative business metrics (e.g., Revenue, Cost, Quantity).
    """

    @staticmethod
    def discover_metrics(df: pd.DataFrame, columns_metadata: Dict[str, ColumnMetadata]) -> List[Metric]:
        """
        Discovers quantitative metrics from the dataset columns.
        """
        metrics = []
        
        for col_name, meta in columns_metadata.items():
            # Metrics are typically numerical measures
            if meta.business_role == "measure" or meta.column_type == "numeric":
                # Skip if it is an identifier or key
                if "id" in col_name.lower() or "key" in col_name.lower():
                    continue

                # Determine candidate metric name (normalized name)
                norm_name = meta.detected_name
                
                # Default formula is SUM, but for rates, ratios, percentages, we prefer AVG
                formula = "SUM"
                col_lower = col_name.lower()
                if "rate" in col_lower or "pct" in col_lower or "percent" in col_lower or "ratio" in col_lower or "average" in col_lower or "avg" in col_lower:
                    formula = "AVG"

                # Compute confidence
                base_score = meta.confidence.score
                reasoning = f"Column has numeric type and acts as a measure. Original confidence: {base_score:.2f}."
                
                # Check ontology for strong match
                concept = OntologyManager.resolve_concept(col_name)
                is_known_metric = concept in ["revenue", "quantity", "salary", "cost", "profit"]
                if is_known_metric:
                    base_score = min(1.0, base_score + 0.15)
                    reasoning += f" Confirmed matching canonical business concept: '{concept}'."

                evidence = EvidenceFactory.create_evidence(
                    source="Profile",
                    description=f"Detected numeric measure column '{col_name}' as business metric candidate '{norm_name}'.",
                    confidence=base_score,
                    supporting_columns=[col_name],
                    supporting_statistics={
                        "concept": concept,
                        "formula": formula,
                        "unique_count": int(df[col_name].nunique()) if col_name in df.columns else 0
                    }
                )

                confidence = ConfidenceEngine.compute_confidence(
                    score=base_score,
                    reasoning=reasoning,
                    evidence=[evidence]
                )

                metrics.append(Metric(
                    name=norm_name,
                    column=col_name,
                    formula=formula,
                    confidence=confidence
                ))

        return metrics
