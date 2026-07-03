from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from backend.services.data_analyst.contracts import ConfidenceBreakdown

class PlatformBaseObject(BaseModel):
    """
    Enforces trace evidence, confidence propagation, and platform audit pathways.
    """
    evidence_ids: List[str] = Field(default_factory=list)
    confidence_breakdown: ConfidenceBreakdown
    validation_status: str = "valid"  # valid, warning, invalid
    limitations: List[str] = Field(default_factory=list)
    generated_by: str = "AI Platform Intelligence"
    reasoning_path: str = ""

class GovernanceReport(PlatformBaseObject):
    """Compliance controls audits, lineage maps, and security checks."""
    compliance_status: str  # certified, warning, non_compliant
    bias_audit: str
    lineage_trail: List[str] = Field(default_factory=list)
    data_sovereignty: str
    audit_trail_hash: str

class ExplainabilityReport(PlatformBaseObject):
    """Local feature attribution weights and logic explanation maps."""
    feature_attributions: Dict[str, float] = Field(default_factory=dict)
    algorithm_details: str
    decision_logic_map: Dict[str, str] = Field(default_factory=dict)

class AuditRecord(BaseModel):
    """Immutable single action audit record cached in Shared Memory."""
    timestamp: str
    action: str
    agent_name: str
    output_hash: str
    reasoning_path: str

class KnowledgeCatalog(PlatformBaseObject):
    """Local glossary parameters and metadata catalogs definitions."""
    defined_rules: List[str] = Field(default_factory=list)
    metadata_catalog: Dict[str, Any] = Field(default_factory=dict)
    business_glossary: Dict[str, str] = Field(default_factory=dict)

class LearningMetrics(PlatformBaseObject):
    """Threshold optimizations metrics compiled from execution runs history."""
    optimized_thresholds: Dict[str, float] = Field(default_factory=dict)
    learning_iterations: int
    accuracy_improvement: float

class PlatformIntelligenceResult(BaseModel):
    """Aggregated Governance Supervisor result payload cached in memory."""
    dataset_id: str
    overall_governance_score: float  # 0 to 100
    explainability_report: ExplainabilityReport
    governance_report: GovernanceReport
    audit_records: List[AuditRecord] = Field(default_factory=list)
    learning_metrics: LearningMetrics
    overall_validation_status: str = "valid"
    global_limitations: List[str] = Field(default_factory=list)
