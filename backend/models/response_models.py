from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class HealthResponse(BaseModel):
    """
    Standard schema for the health endpoint.
    """
    status: str = Field(..., json_schema_extra={"example": "healthy"})
    version: str = Field(..., json_schema_extra={"example": "1.0.0"})
    service: str = Field(..., json_schema_extra={"example": "InsightForge Backend"})

class UploadResponse(BaseModel):
    """
    Metadata returned after staging a file.
    """
    dataset_id: str = Field(..., alias="datasetId")
    file_name: str = Field(..., alias="fileName")
    file_size: int = Field(..., alias="fileSize")
    content_type: str = Field(..., alias="contentType")
    message: str

    model_config = {
        "populate_by_name": True
    }

class DatasetMetadata(BaseModel):
    dataset_id: str = Field(default="", alias="datasetId")
    file_name: str = Field(default="", alias="fileName")
    row_count: int = Field(default=0, alias="rowCount")
    column_count: int = Field(default=0, alias="columnCount")
    columns: List[str] = Field(default_factory=list)
    preview: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = {
        "populate_by_name": True
    }

class QualityIssue(BaseModel):
    id: str
    column: Optional[str] = None
    severity: str
    description: str
    action: Optional[str] = None

class QualityReport(BaseModel):
    quality_score: int = Field(default=100, alias="qualityScore")
    issues: List[QualityIssue] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

    model_config = {
        "populate_by_name": True
    }

class ColumnProfileDetail(BaseModel):
    name: str
    role: str
    type: str
    null_pct: float = Field(default=0.0, alias="nullPct")

    model_config = {
        "populate_by_name": True
    }

class ProfileReport(BaseModel):
    domain: str = "generic"
    domain_confidence: float = Field(default=1.0, alias="domainConfidence")
    columns: List[ColumnProfileDetail] = Field(default_factory=list)

    model_config = {
        "populate_by_name": True
    }

class KPIDetail(BaseModel):
    id: str
    label: str
    value: float
    formatted_value: str = Field(..., alias="formattedValue")
    rationale: str

    model_config = {
        "populate_by_name": True
    }

class CorrelationDetail(BaseModel):
    a: str
    b: str
    r: float
    strength: str
    explanation: str

class AnomalyDetail(BaseModel):
    id: str
    type: str
    column: Optional[str] = None
    severity: str
    description: str
    remedy: str

class ForecastPeriod(BaseModel):
    period: str
    predicted: float
    lower: float
    upper: float

class ForecastDetail(BaseModel):
    method: str
    next_periods: List[ForecastPeriod] = Field(default_factory=list, alias="nextPeriods")
    confidence: float
    explanation: str

    model_config = {
        "populate_by_name": True
    }

class RecommendationDetail(BaseModel):
    id: str
    action: str
    expected_impact: str = Field(..., alias="expectedImpact")
    effort: str
    priority: str
    risk_of_inaction: str = Field(..., alias="riskOfInaction")

    model_config = {
        "populate_by_name": True
    }

class InsightDetail(BaseModel):
    id: str
    level: str
    title: str
    observation: str
    summary: str
    recommendation: str

class NarrativeDetail(BaseModel):
    situation: str
    complication: str
    insight: str
    recommendation: str
    expected_outcome: str = Field(..., alias="expectedOutcome")

    model_config = {
        "populate_by_name": True
    }

class AnalyzeResponse(BaseModel):
    """
    Response model for /analyze. Matches frontend contract format.
    """
    dataset: DatasetMetadata
    quality: QualityReport
    profile: ProfileReport
    kpis: List[KPIDetail] = Field(default_factory=list)
    correlations: List[CorrelationDetail] = Field(default_factory=list)
    anomalies: List[AnomalyDetail] = Field(default_factory=list)
    forecast: Dict[str, ForecastDetail] = Field(default_factory=dict)
    recommendations: List[RecommendationDetail] = Field(default_factory=list)
    insights: List[InsightDetail] = Field(default_factory=list)
    narrative: NarrativeDetail
