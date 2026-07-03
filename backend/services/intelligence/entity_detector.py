import pandas as pd
from typing import List, Dict, Any
from backend.services.intelligence.contracts import BusinessEntity, ColumnMetadata
from backend.services.intelligence.confidence_engine import ConfidenceEngine
from backend.services.intelligence.evidence import EvidenceFactory

class EntityDetector:
    """
    Detects semantic business entities within a dataset by mapping and clustering columns.
    Examples: Customer, Product, Order, Employee, Location, etc.
    """

    @staticmethod
    def detect_entities(df: pd.DataFrame, columns_metadata: Dict[str, ColumnMetadata]) -> List[BusinessEntity]:
        """
        Scans column metadata and clusters columns into business entities.
        """
        entities = []
        
        # Define entity clusters based on canonical concepts and naming clues
        entity_configs = {
            "Customer": {
                "concepts": ["customer"],
                "keywords": ["cust", "client", "buyer", "consumer", "member", "visitor"],
                "type": "Party"
            },
            "Product": {
                "concepts": ["product"],
                "keywords": ["prod", "item", "sku", "article", "merchandise", "good"],
                "type": "Resource"
            },
            "Transaction": {
                "concepts": ["revenue", "cost", "quantity"],
                "keywords": ["order", "tx", "trans", "sale", "invoice", "receipt", "deal", "payment"],
                "type": "Event"
            },
            "Employee": {
                "concepts": ["salary"],
                "keywords": ["emp", "employee", "staff", "rep", "agent", "worker", "manager", "mgr"],
                "type": "Party"
            },
            "Location": {
                "concepts": ["location"],
                "keywords": ["region", "country", "state", "city", "address", "zip", "store", "loc"],
                "type": "Dimension"
            }
        }

        for entity_name, config in entity_configs.items():
            related_cols = []
            has_id = False
            has_name_or_desc = False
            
            # Find columns matching the concepts or keywords
            for col_name, meta in columns_metadata.items():
                col_lower = col_name.lower()
                matches_concept = meta.confidence.supporting_evidence[0].supporting_statistics.get("canonical_concept") in config["concepts"] if meta.confidence.supporting_evidence else False
                matches_keyword = any(kw in col_lower for kw in config["keywords"])
                
                if matches_concept or matches_keyword:
                    related_cols.append(col_name)
                    if "id" in col_lower or "key" in col_lower or meta.business_role == "key":
                        has_id = True
                    if "name" in col_lower or "desc" in col_lower or "title" in col_lower:
                        has_name_or_desc = True

            if related_cols:
                # Calculate confidence score
                # 1. Base score starts at 0.5
                score = 0.5
                reasoning_steps = ["Detected column patterns matching the entity."]
                
                # 2. Boost if we have a primary/foreign key ID
                if has_id:
                    score += 0.25
                    reasoning_steps.append("Entity has a key identifier column.")
                
                # 3. Boost if we have both ID and descriptive columns (name/description)
                if has_id and has_name_or_desc:
                    score += 0.15
                    reasoning_steps.append("Entity has both key identifier and descriptive metadata.")
                
                # 4. Boost based on number of columns matching
                col_boost = min(0.1, len(related_cols) * 0.02)
                score += col_boost
                reasoning_steps.append(f"Entity is associated with {len(related_cols)} columns.")

                score = min(1.0, score)
                
                evidence = EvidenceFactory.create_evidence(
                    source="Heuristic",
                    description=f"Clustered columns {related_cols} for entity '{entity_name}'.",
                    confidence=score,
                    supporting_columns=related_cols,
                    supporting_statistics={
                        "has_id": has_id,
                        "has_name_or_desc": has_name_or_desc,
                        "related_columns_count": len(related_cols)
                    }
                )
                
                confidence = ConfidenceEngine.compute_confidence(
                    score=score,
                    reasoning="; ".join(reasoning_steps),
                    evidence=[evidence]
                )
                
                entities.append(BusinessEntity(
                    name=entity_name,
                    type=config["type"],
                    columns=related_cols,
                    confidence=confidence
                ))
                
        return entities
