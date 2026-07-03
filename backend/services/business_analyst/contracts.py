from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from backend.services.data_analyst.contracts import ConfidenceBreakdown

class BusinessAnalystBaseObject(BaseModel):
    """
    Base class enforcing complete traceability, confidence propagation,
    reasoning path, and validation bounds for business analyst findings.
    """
    evidence_ids: List[str] = Field(default_factory=list)
    confidence_breakdown: ConfidenceBreakdown
    validation_status: str = "valid"  # valid, warning, invalid
    limitations: List[str] = Field(default_factory=list)
    generated_by: str = "AI Business Analyst"
    reasoning_path: str = ""

class BusinessFinding(BusinessAnalystBaseObject):
    """Profile details for discovered anomalies, segments, or trends."""
    finding_id: str
    metric_name: str
    finding_type: str  # trend, segment, anomaly
    description: str
    numerical_impact: float

class RootCause(BusinessAnalystBaseObject):
    """Structured Root Cause analysis mapping observations to frameworks (Five Whys)."""
    cause_id: str
    observation: str
    framework_used: str  # five_whys, fishbone, cause_tree
    supporting_evidence: List[str] = Field(default_factory=list)
    counter_evidence: List[str] = Field(default_factory=list)
    impact_score: float

class Hypothesis(BusinessAnalystBaseObject):
    """A proposed explanation for business changes prior to validation."""
    hypothesis_id: str
    formulated_text: str
    tested_variable: str
    proposed_cause: str

class ValidatedHypothesis(BusinessAnalystBaseObject):
    """A mathematically verified hypothesis backed by statistical results."""
    hypothesis_id: str
    formulated_text: str
    contradictions: List[str] = Field(default_factory=list)
    supporting_findings: List[str] = Field(default_factory=list)

class Opportunity(BusinessAnalystBaseObject):
    """Identified value opportunities tracking potential business gains."""
    opportunity_id: str
    opportunity_type: str  # revenue_increase, cost_reduction, efficiency, risk_reduction
    priority: str  # high, medium, low
    business_value: float
    estimated_roi: float
    implementation_difficulty: str  # high, medium, low
    time_horizon: str  # short, medium, long

class Risk(BusinessAnalystBaseObject):
    """Discovered threat categories mapping probability, impact, and mitigation steps."""
    risk_id: str
    risk_type: str  # operational, financial, data, business, strategic
    probability: float
    impact: float
    severity: float  # probability * impact
    mitigation: str
    owner_recommendation: str

class Recommendation(BusinessAnalystBaseObject):
    """Targeted, non-generic business recommendation details."""
    rec_id: str
    observation: str
    business_reason: str
    expected_outcome: str
    owner: str
    timeline: str
    priority: str
    roi: float
    dependencies: List[str] = Field(default_factory=list)
    success_metric: str

class PrioritizedRecommendation(BaseModel):
    """Prioritization metadata ranking a recommendation for executives."""
    rec_id: str
    priority_score: float
    priority_level: str  # Critical, High, Medium, Low
    rank_position: int
    priority_reason: str

class BusinessNarrative(BusinessAnalystBaseObject):
    """Executive Story narrative hierarchy structure."""
    narrative_id: str
    situation: str
    finding: str
    evidence: str
    business_meaning: str
    recommendation: str
    expected_business_impact: str

from datetime import datetime
from backend.services.intelligence.contracts import ReasoningNode

class BusinessReasoningEdge(BaseModel):
    """
    A connection representing dependency or cause in the business reasoning graph
    enriched with confidence, evidence references, and timestamp.
    """
    source: str = Field(..., description="ID of source ReasoningNode")
    target: str = Field(..., description="ID of target ReasoningNode")
    relationship_type: str = Field(..., description="Type of edge relationship (e.g. causes, validates, yields)")
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    confidence: float
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

class BusinessReasoningGraph(BaseModel):
    """
    Graph structure holding nodes and edges representing the decision reasoning flow.
    """
    nodes: Dict[str, ReasoningNode] = Field(default_factory=dict)
    edges: List[BusinessReasoningEdge] = Field(default_factory=list)

class BusinessAnalystResult(BaseModel):
    """Aggregated business analyst outcomes cached in memory."""
    dataset_id: str
    findings: List[BusinessFinding] = Field(default_factory=list)
    root_causes: List[RootCause] = Field(default_factory=list)
    hypotheses: List[ValidatedHypothesis] = Field(default_factory=list)
    opportunities: List[Opportunity] = Field(default_factory=list)
    risks: List[Risk] = Field(default_factory=list)
    recommendations: List[Recommendation] = Field(default_factory=list)
    prioritized_recommendations: List[PrioritizedRecommendation] = Field(default_factory=list)
    narratives: List[BusinessNarrative] = Field(default_factory=list)
    overall_validation_status: str = "valid"
    global_limitations: List[str] = Field(default_factory=list)
