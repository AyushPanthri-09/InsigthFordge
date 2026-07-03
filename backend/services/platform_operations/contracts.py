from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from backend.services.data_analyst.contracts import ConfidenceBreakdown

class OperationsBaseObject(BaseModel):
    """
    Enforces trace evidence, confidence propagation, and operational audit pathways.
    """
    evidence_ids: List[str] = Field(default_factory=list)
    confidence_breakdown: ConfidenceBreakdown
    validation_status: str = "valid"  # valid, warning, invalid
    limitations: List[str] = Field(default_factory=list)
    generated_by: str = "AI Platform Operations"
    reasoning_path: str = ""

class DeploymentRecord(BaseModel):
    """Deployment lifecycle mapping version, env status, and release tag."""
    deployment_id: str
    version: str
    timestamp: str
    environment: str
    status: str

class SchedulerJob(BaseModel):
    """Scheduler cron definitions for hourly/daily execution tasks."""
    job_id: str
    schedule_type: str  # hourly, daily, weekly, monthly, quarterly
    active: bool
    last_run: Optional[str] = None

class RegistryEntry(BaseModel):
    """Version registry mapping health status of system modules."""
    module_name: str
    version: str
    status: str
    health: str

class ExperimentRecord(BaseModel):
    """Experiment configuration parameters, benchmarks, and comparison baselines."""
    experiment_id: str
    configuration: Dict[str, Any] = Field(default_factory=dict)
    runtime: float
    benchmark_score: float
    success_rate: float

class BenchmarkResult(BaseModel):
    """Benchmark results measurements (CPU, RAM, latency, and performance index)."""
    cpu_usage: float
    ram_usage: float
    latency: float
    cache_hit_rate: float
    score: float

class SecurityPolicy(BaseModel):
    """Authentication, authorization rules, and local encryption check policies."""
    auth_policy: str
    authorization_rules: List[str] = Field(default_factory=list)
    encrypted: bool

class AccessRole(BaseModel):
    """Role-Based Access Control (RBAC) permissions (Admin, Executive, Viewer)."""
    role_name: str
    permissions: List[str] = Field(default_factory=list)

class ConfigurationProfile(BaseModel):
    """Timeout policies, resource limits, and cache configuration profiles."""
    retry_policy: Dict[str, Any] = Field(default_factory=dict)
    timeout_policy: Dict[str, Any] = Field(default_factory=dict)
    resource_limits: Dict[str, Any] = Field(default_factory=dict)

class BackupSnapshot(BaseModel):
    """Memory backup snapshot hash records representing system checkpoint archives."""
    snapshot_id: str
    timestamp: str
    hash_code: str

class RecoveryPoint(BaseModel):
    """Disaster recovery point restored status flags."""
    backup_id: str
    timestamp: str
    restored: bool

class ObservabilityMetrics(BaseModel):
    """Real-time observability dashboard statistics (active counts, queue depth)."""
    active_workflows: int
    latency: float
    failed_runs: int

class PlatformOperationsMetrics(BaseModel):
    """Reliability KPIs (Availability, Success Rate, MTTR)."""
    availability: float
    reliability: float
    success_rate: float
    error_rate: float

class PlatformOperationsResult(BaseModel):
    """Master operational result payload cached in memory."""
    dataset_id: str
    deployment_record: DeploymentRecord
    scheduler_job: SchedulerJob
    registry_entry: RegistryEntry
    benchmark_result: BenchmarkResult
    security_policy: SecurityPolicy
    observability_metrics: ObservabilityMetrics
    operations_metrics: PlatformOperationsMetrics
    overall_validation_status: str = "valid"
    global_limitations: List[str] = Field(default_factory=list)
