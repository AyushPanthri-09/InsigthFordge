from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from backend.services.data_analyst.contracts import ConfidenceBreakdown

class StrategyAdvisorBaseObject(BaseModel):
    """
    Enforces trace evidence, confidence propagation, and strategic audit pathways.
    """
    evidence_ids: List[str] = Field(default_factory=list)
    confidence_breakdown: ConfidenceBreakdown
    validation_status: str = "valid"  # valid, warning, invalid
    limitations: List[str] = Field(default_factory=list)
    generated_by: str = "AI Strategy Advisor"
    reasoning_path: str = ""

class StrategicPriority(StrategyAdvisorBaseObject):
    """A strategic priority title and its targeted business focus areas."""
    priority_id: str
    title: str
    description: str
    target_kpi: str

class Decision(StrategyAdvisorBaseObject):
    """Calculated decision prioritization rankings and execution orders."""
    decision_id: str
    recommendation_id: str
    priority_score: float
    priority_level: str  # Critical, High, Medium, Low
    execution_order: int
    business_reason: str

class DecisionMatrix(BaseModel):
    """List container of executive decisions."""
    decisions: List[Decision] = Field(default_factory=list)

class Scenario(StrategyAdvisorBaseObject):
    """Conservative, Balanced, or Aggressive strategy scenario definitions."""
    scenario_type: str  # Conservative, Balanced, Aggressive
    expected_benefits: str
    expected_risks: str
    confidence: float
    required_effort: str  # high, medium, low
    timeline: str
    assumptions: List[str] = Field(default_factory=list)

class WhatIfScenario(StrategyAdvisorBaseObject):
    """Simulated pricing, marketing, cost, or workforce what-if analysis."""
    simulation_type: str  # price_increase, marketing_increase, cost_reduction, workforce_expansion, inventory_increase
    expected_impact: str
    confidence: float
    assumptions: List[str] = Field(default_factory=list)

class ActionPlan(StrategyAdvisorBaseObject):
    """Chronologically grouped task outlines (Immediate, 30 Days, 90 Days, etc.)."""
    action_id: str
    milestone: str  # Immediate, 30 Days, 90 Days, 6 Months, 12 Months
    owner: str
    dependencies: List[str] = Field(default_factory=list)
    expected_outcome: str
    target_kpi: str
    priority: str
    effort: str
    confidence: float

class Roadmap(StrategyAdvisorBaseObject):
    """Chronological milestone map containing action tasks."""
    roadmap_id: str
    milestones: Dict[str, List[ActionPlan]] = Field(default_factory=dict)

class ExecutiveSlide(BaseModel):
    """Presentation slide structure for downstream rendering."""
    title: str
    content: List[str] = Field(default_factory=list)
    evidence_references: List[str] = Field(default_factory=list)
    slide_type: str = "bullet"

class PresentationMetadata(StrategyAdvisorBaseObject):
    """Slide container holding presentation metadata."""
    presentation_id: str
    slides: List[ExecutiveSlide] = Field(default_factory=list)

class ExecutiveReport(StrategyAdvisorBaseObject):
    """Structured report fields holding the finalized markdown narrative."""
    report_id: str
    executive_summary: str
    key_findings: str
    opportunities: str
    risks: str
    recommendations: str
    roadmap_summary: str
    outlook: str
    confidence_summary: str

class StrategyAdvisorResult(BaseModel):
    """Aggregated Strategy Advisor payload cached in memory."""
    dataset_id: str
    decision_matrix: DecisionMatrix
    scenarios: List[Scenario] = Field(default_factory=list)
    what_if_simulations: List[WhatIfScenario] = Field(default_factory=list)
    action_plans: List[ActionPlan] = Field(default_factory=list)
    roadmap: Roadmap
    executive_report: ExecutiveReport
    presentation: PresentationMetadata
    overall_validation_status: str = "valid"
    global_limitations: List[str] = Field(default_factory=list)
