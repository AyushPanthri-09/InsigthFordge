from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class ValidationIssue(BaseModel):
    """
    Validation error or warning flagged during structural/lexical checks.
    """
    id: str
    column: Optional[str] = None
    severity: str = Field(..., description="Severity level: low, medium, high, critical")
    description: str
    action: Optional[str] = None


class QualityScore(BaseModel):
    """
    Complex breakdown of the dataset's quality rating.
    """
    score: float = Field(..., ge=0.0, le=100.0)
    level: str = Field(..., description="Excellent, Good, Moderate, Poor, Critical")
    completeness: float = Field(..., ge=0.0, le=1.0)
    integrity: float = Field(..., ge=0.0, le=1.0)
    schema_quality: float = Field(..., ge=0.0, le=1.0)
    trust_score: float = Field(..., ge=0.0, le=100.0)


class CleaningAction(BaseModel):
    """
    A deterministic, lossless transformation applied directly to the dataset.
    """
    action_id: str
    action_type: str = Field(..., description="e.g. trim_whitespace, normalize_date, cast_currency")
    column: Optional[str] = None
    description: str
    rows_affected: int
    risk: str = Field(default="low")
    rollback_id: str


class CleaningDecision(BaseModel):
    """
    A proposed, potentially destructive repair action deferred for review.
    """
    decision_id: str
    issue_id: str
    action_type: str = Field(..., description="e.g. impute_nulls, delete_rows, merge_duplicates")
    column: Optional[str] = None
    rationale: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    evidence: Dict[str, Any] = Field(default_factory=dict)
    estimated_rows_affected: int
    risk: str = Field(..., description="low, medium, high")
    rollback_strategy: str


class AuditEntry(BaseModel):
    """
    Audit trail log documenting modifications.
    """
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    action: str
    reason: str
    evidence: Dict[str, Any] = Field(default_factory=dict)
    confidence: float
    affected_data_summary: str
    rollback_info: Dict[str, Any] = Field(default_factory=dict)
    agent_version: str = Field(default="1.0.0")


class Certification(BaseModel):
    """
    Official certificate verifying the trust status of the dataset.
    """
    status: str = Field(..., description="certified, warning, rejected")
    overall_score: float
    level: str
    certified_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    auditor_name: str = Field(default="AIDataEngineer")
    explanation: str


class QualityReport(BaseModel):
    """
    Detailed quality report including validation issues and deferred cleaning decisions.
    """
    dataset_id: str
    quality_score: QualityScore
    issues: List[ValidationIssue] = Field(default_factory=list)
    cleaning_decisions: List[CleaningDecision] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class TrustedDataset(BaseModel):
    """
    The final certified product of the AI Data Engineer.
    Stores metadata, dictionaries, quality reports, and transformation logs.
    """
    dataset_id: str
    row_count: int
    column_count: int
    columns: List[str]
    column_dictionary: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Metadata dictionary for each column")
    quality_report: QualityReport
    certification: Certification
    cleaning_log: List[CleaningAction] = Field(default_factory=list)
    audit_trail: List[AuditEntry] = Field(default_factory=list)

    model_config = {
        "arbitrary_types_allowed": True
    }
