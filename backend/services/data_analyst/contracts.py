from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ConfidenceBreakdown(BaseModel):
    """
    Structured confidence propagation tracking data quality, semantic,
    statistical, and business factors.
    """
    data_quality_confidence: float = Field(..., ge=0.0, le=1.0)
    semantic_confidence: float = Field(..., ge=0.0, le=1.0)
    statistical_confidence: float = Field(..., ge=0.0, le=1.0)
    business_confidence: float = Field(..., ge=0.0, le=1.0)
    overall_confidence: float = Field(..., ge=0.0, le=1.0)

class AnalystBaseObject(BaseModel):
    """
    Base class enforcing complete traceability, limitations tracking,
    confidence propagation, and reasoning path tracking for every finding.
    """
    evidence_ids: List[str] = Field(default_factory=list)
    confidence_breakdown: ConfidenceBreakdown
    validation_status: str = "valid"  # valid, warning, invalid
    limitations: List[str] = Field(default_factory=list)
    generated_by: str = "AI Data Analyst"
    reasoning_path: str = ""

class KPIDefinition(AnalystBaseObject):
    """Profile definition for discovered domain business metrics."""
    name: str
    definition: str
    formula: str
    business_meaning: str

class KPIResult(AnalystBaseObject):
    """Calculated KPI metric values, temporal history, and dimension aggregates."""
    kpi_name: str
    current_value: float
    historical_values: List[float] = Field(default_factory=list)
    dimensions_breakdown: Dict[str, Dict[str, float]] = Field(default_factory=dict)

class StatisticalResult(AnalystBaseObject):
    """Detailed outcomes from statistical testing procedures."""
    method_name: str
    test_statistic: float
    p_value: float
    selection_rationale: str
    is_significant: bool
    business_interpretation: str

class TrendResult(AnalystBaseObject):
    """Discovered growth, decline, plates, structural breaks, and seasonal cycles."""
    column: str
    direction: str  # growth, decline, plateau, stable
    change_points: List[str] = Field(default_factory=list)
    seasonality_detected: bool
    seasonality_period: Optional[int] = None
    explanation: str

class ForecastResult(AnalystBaseObject):
    """Autoregressive or Exponentially Smoothed future projections with confidence bounds."""
    column: str
    forecast_values: List[float] = Field(default_factory=list)
    confidence_interval_lower: List[float] = Field(default_factory=list)
    confidence_interval_upper: List[float] = Field(default_factory=list)
    r_squared: float
    mse: float
    assumptions: List[str] = Field(default_factory=list)

class SegmentResult(AnalystBaseObject):
    """Identified categories, top/bottom outliers, and emerging cohorts."""
    dimension: str
    segment_name: str
    performance_metric: float
    comparison_to_average: float
    insights: List[str] = Field(default_factory=list)

class AnomalyResult(AnalystBaseObject):
    """Classified anomaly with correlation evidence (operational, promo, or fraud)."""
    anomaly_id: str
    timestamp_or_index: str
    column: str
    value: float
    classification: str  # business_event, promo, operational, data_error, unknown
    explanation: str

class Insight(AnalystBaseObject):
    """Evidence-backed business insight synthesized from statistical discoveries."""
    insight_id: str
    finding: str
    business_meaning: str
    statistical_validation: str
    affected_kpis: List[str] = Field(default_factory=list)
    affected_segments: List[str] = Field(default_factory=list)
    related_charts: List[str] = Field(default_factory=list)

class AnalystQuestion(AnalystBaseObject):
    """Generated questions for downstream business reasoning (Phase 4)."""
    question_id: str
    question_text: str
    target_metric: str
    hypothesis_to_investigate: str
    urgency: str  # high, medium, low

class AnalystResult(BaseModel):
    """Compiles all discovered analytics, KPIs, statistical results, and insights."""
    dataset_id: str
    kpi_definitions: List[KPIDefinition] = Field(default_factory=list)
    kpis: List[KPIResult] = Field(default_factory=list)
    statistical_tests: List[StatisticalResult] = Field(default_factory=list)
    trends: List[TrendResult] = Field(default_factory=list)
    forecasts: List[ForecastResult] = Field(default_factory=list)
    segments: List[SegmentResult] = Field(default_factory=list)
    anomalies: List[AnomalyResult] = Field(default_factory=list)
    insights: List[Insight] = Field(default_factory=list)
    questions: List[AnalystQuestion] = Field(default_factory=list)
    overall_validation_status: str = "valid"
    global_limitations: List[str] = Field(default_factory=list)
