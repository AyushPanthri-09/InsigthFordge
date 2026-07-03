from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.services.intelligence.contracts import Evidence

class EvidenceFactory:
    """
    Utility factory to build and standardize Evidence contracts.
    """

    @staticmethod
    def create_evidence(
        source: str,
        description: str,
        confidence: float,
        supporting_columns: Optional[List[str]] = None,
        supporting_statistics: Optional[Dict[str, Any]] = None,
        validation_status: str = "valid",
        agent_name: str = "SemanticEngine"
    ) -> Evidence:
        """
        Creates and returns a standardized Evidence object.
        """
        return Evidence(
            source=source,
            description=description,
            confidence=max(0.0, min(1.0, confidence)),
            supporting_columns=supporting_columns or [],
            supporting_statistics=supporting_statistics or {},
            validation_status=validation_status,
            timestamp=datetime.utcnow().isoformat() + "Z",
            agent_name=agent_name
        )
