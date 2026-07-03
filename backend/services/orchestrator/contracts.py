from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ExecutionStage(BaseModel):
    """Execution metrics and status tracking for a single workflow stage."""
    stage_id: str
    name: str
    dependencies: List[str] = Field(default_factory=list)
    status: str = "pending"  # pending, running, completed, failed, skipped
    retries: int = 0
    duration: float = 0.0
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)

class WorkflowContext(BaseModel):
    """Complete active runtime context container for a workflow execution."""
    workflow_id: str
    dataset_id: str
    user_id: Optional[str] = None
    start_time: str
    current_stage: Optional[str] = None
    completed_stages: List[str] = Field(default_factory=list)
    failed_stage: Optional[str] = None
    execution_status: str = "running"  # running, completed, failed
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    memory_keys: List[str] = Field(default_factory=list)
    resource_usage: Dict[str, Any] = Field(default_factory=dict)
    timings: Dict[str, float] = Field(default_factory=dict)

class WorkflowCheckpoint(BaseModel):
    """Serialized checkpoint container for resuming execution after failure."""
    stage_id: str
    state_data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str

class ExecutionProgress(BaseModel):
    """Workflow progress indicators for real-time telemetry."""
    current_phase: str
    overall_progress_pct: float
    running_module: str
    est_remaining_time: float
    completed_stages: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)

class WorkflowEvent(BaseModel):
    """Causal event telemetry dispatched to event bus listeners."""
    event_type: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str

class ExecutionHistory(BaseModel):
    """Historical audit logging record for past workflow executions."""
    workflow_id: str
    dataset_id: str
    timestamps: Dict[str, str] = Field(default_factory=dict)
    durations: Dict[str, float] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    generated_artifacts: List[str] = Field(default_factory=list)
    resource_metrics: Dict[str, Any] = Field(default_factory=dict)
    completed_stages: List[str] = Field(default_factory=list)
    checkpoint_history: List[str] = Field(default_factory=list)

class WorkflowMetrics(BaseModel):
    """Hardware resource status metrics checked during workflow runs."""
    cpu_usage: float
    ram_usage: float
    dataset_size: int
    est_processing_time: float

class PipelineExecution(BaseModel):
    """Container tracking overall stages list for a pipeline."""
    workflow_id: str
    stages: List[ExecutionStage] = Field(default_factory=list)

class OrchestratorResult(BaseModel):
    """Aggregated workflow engine output mapping directly to pipeline targets."""
    workflow_id: str
    dataset_id: str
    dataframe: Any = None
    validation_report: Any = None
    cleaning_log: Any = None
    profile_report: Any = None
    eda_report: Any = None
    stats_results: List[Any] = Field(default_factory=list)
    analyst_result: Any = None
    business_result: Any = None
    strategy_result: Any = None
    executive_result: Any = None
    status: str = "completed"
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
