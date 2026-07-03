from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class Evidence(BaseModel):
    """
    Standardized evidence container representing facts or heuristics supporting a conclusion.
    """
    source: str = Field(..., description="The source of the evidence (e.g. Heuristic, Schema, Profile, User)")
    description: str = Field(..., description="A human-readable description of what this evidence is.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="The strength of the evidence.")
    supporting_columns: List[str] = Field(default_factory=list, description="Columns involved in supporting this claim.")
    supporting_statistics: Dict[str, Any] = Field(default_factory=dict, description="Statistics (e.g. uniqueness, null ratio) backing this evidence.")
    validation_status: str = Field(default="valid", description="Status of validation (e.g. valid, invalid, warning)")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z", description="Timestamp of when the evidence was collected.")
    agent_name: str = Field(default="SemanticEngine", description="The name of the agent or component that collected this evidence.")


class Confidence(BaseModel):
    """
    Standardized confidence scoring container.
    """
    score: float = Field(..., ge=0.0, le=1.0, description="Float score from 0.0 to 1.0.")
    level: str = Field(..., description="Confidence level (e.g. HIGH, MEDIUM, LOW)")
    reasoning: str = Field(..., description="Clear explanation of how the confidence score was derived.")
    validation_status: str = Field(default="valid", description="Status of the confidence determination.")
    supporting_evidence: List[Evidence] = Field(default_factory=list, description="Evidence objects backing this score.")


class ColumnMetadata(BaseModel):
    """
    Semantic metadata parsed for an individual column in a dataset.
    """
    original_name: str
    detected_name: str
    detected_meaning: str
    column_type: str = Field(..., description="Data type (e.g., numeric, categorical, temporal, boolean, identifier, geolocation)")
    business_role: str = Field(..., description="Business role (e.g., measure, dimension, key, status, code, location, percentage)")
    confidence: Confidence
    possible_alternatives: List[str] = Field(default_factory=list, description="Possible alternative meanings or roles.")


class BusinessDomain(BaseModel):
    """
    Business domain categorization prediction.
    """
    domain: str = Field(..., description="Domain name (e.g., Retail, Finance, Healthcare)")
    confidence: Confidence


class BusinessEntity(BaseModel):
    """
    A logical business entity detected within the dataset.
    """
    name: str = Field(..., description="Normalized entity name (e.g., Customer, Product, Order)")
    type: str = Field(..., description="Entity type classification")
    columns: List[str] = Field(..., description="Columns that form or relate to this entity.")
    confidence: Confidence


class Metric(BaseModel):
    """
    A business metric candidate discovered within the dataset.
    """
    name: str = Field(..., description="Normalized metric name (e.g., Revenue, OrderCount)")
    column: str = Field(..., description="Column associated with the metric.")
    formula: str = Field(default="SUM", description="Default aggregation function (e.g. SUM, AVG, COUNT, MIN, MAX)")
    confidence: Confidence


class Dimension(BaseModel):
    """
    A business dimension candidate discovered within the dataset.
    """
    name: str = Field(..., description="Normalized dimension name (e.g., Region, Category, Year)")
    column: str = Field(..., description="Column associated with the dimension.")
    type: str = Field(..., description="Dimension type (e.g. temporal, spatial, categorical)")
    confidence: Confidence


class ReasoningNode(BaseModel):
    """
    A claim or hypothesis in the reasoning graph.
    """
    id: str
    label: str
    node_type: str = Field(..., description="Type of node (e.g. Claim, Heuristic, Conclusion)")
    description: str
    evidence: List[Evidence] = Field(default_factory=list)


class ReasoningEdge(BaseModel):
    """
    A connection representing dependency or cause between two reasoning nodes.
    """
    source: str = Field(..., description="ID of source ReasoningNode")
    target: str = Field(..., description="ID of target ReasoningNode")
    relationship_type: str = Field(default="supports", description="Type of edge relationship (e.g. supports, refutes, causes)")


class DatasetMetadata(BaseModel):
    """
    Structural and semantic metadata for the entire dataset.
    """
    row_count: int
    col_count: int
    grain: str = Field(..., description="Explanation of what a single row represents (e.g., One invoice line item)")
    grain_confidence: Confidence
    primary_keys: List[str] = Field(default_factory=list)
    candidate_keys: List[List[str]] = Field(default_factory=list)
    foreign_keys: List[Dict[str, Any]] = Field(default_factory=list)
    relationships: List[Dict[str, Any]] = Field(default_factory=list)
    hierarchies: List[Dict[str, Any]] = Field(default_factory=list)
    unique_constraints: List[str] = Field(default_factory=list)
    duplicate_ratio: float = Field(0.0, ge=0.0, le=1.0)
    functional_dependencies: List[Dict[str, Any]] = Field(default_factory=list)


class SemanticResult(BaseModel):
    """
    Full output payload generated by the UniversalSemanticEngine.
    """
    dataset_metadata: DatasetMetadata
    columns: Dict[str, ColumnMetadata]
    domains: List[BusinessDomain]
    metrics: List[Metric]
    dimensions: List[Dimension]
    entities: List[BusinessEntity]
    memory_ref_id: str = ""
