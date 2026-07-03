import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from backend.services.orchestrator import (
    AIOrchestrator,
    WorkflowEngine,
    DependencyManager,
    RetryManager,
    CheckpointManager,
    ProgressTracker,
    EventBus,
    ResourceManager,
    HealthMonitor,
    WorkflowContext,
    ExecutionStage,
    OrchestratorResult
)
from backend.services.intelligence.memory import SharedProjectMemory

@pytest.fixture
def mock_df():
    """Generates a small mock dataset."""
    np.random.seed(42)
    rows = 20
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(rows)]
    
    # declining trend
    revenue = [100.0 - 1.0 * i + np.random.normal(0, 0.1) for i in range(rows)]
    
    return pd.DataFrame({
        "order_date": [d.strftime("%Y-%m-%d") for d in dates],
        "revenue_val": revenue,
        "sales_val": [50.0 + np.random.normal(0, 1.0) for _ in range(rows)]
    })

def test_dependency_manager_dag_validation():
    # Valid DAG
    stages1 = [
        ExecutionStage(stage_id="A", name="A", dependencies=[]),
        ExecutionStage(stage_id="B", name="B", dependencies=["A"])
    ]
    assert DependencyManager.validate_dependencies(stages1) is True
    
    # Invalid Circular DAG
    stages2 = [
        ExecutionStage(stage_id="A", name="A", dependencies=["B"]),
        ExecutionStage(stage_id="B", name="B", dependencies=["A"])
    ]
    assert DependencyManager.validate_dependencies(stages2) is False

def test_retry_manager_logic():
    calls = 0
    def failing_callable():
        nonlocal calls
        calls += 1
        if calls < 3:
            raise RuntimeError("Transient Error")
        return "success"

    result = RetryManager.execute_with_retry(
        failing_callable,
        max_retries=3,
        retry_delay=0.1,
        backoff_multiplier=1.5,
        stage_name="TestRetry"
    )
    assert result == "success"
    assert calls == 3

def test_checkpoint_manager(mock_df):
    CheckpointManager.clear_checkpoints("test_check_ds")
    
    CheckpointManager.save_checkpoint("test_check_ds", "Semantic", {"completed": True})
    last = CheckpointManager.get_last_checkpoint("test_check_ds")
    
    assert last is not None
    assert last.stage_id == "Semantic"
    assert last.state_data == {"completed": True}

def test_progress_tracker():
    tracker = ProgressTracker("test_prog_ds")
    tracker.update_progress("Semantic", 16.6, "Semantic", 30.0)
    
    prog = tracker.get_progress()
    assert prog.current_phase == "Semantic"
    assert prog.overall_progress_pct == 16.6
    
    # Verify cached in memory
    mem = SharedProjectMemory()
    cached = mem.get_metadata("test_prog_ds", "progress")
    assert cached["current_phase"] == "Semantic"

def test_event_bus():
    bus = EventBus()
    events_caught = []
    
    def listener(event):
        events_caught.append(event)
        
    bus.register_listener("TestEvent", listener)
    bus.publish("TestEvent", {"data": "telemetry"}, dataset_id="test_event_ds")
    
    assert len(events_caught) == 1
    assert events_caught[0].event_type == "TestEvent"
    assert events_caught[0].payload == {"data": "telemetry"}

def test_resource_manager():
    warnings = ResourceManager.check_and_throttle(100)
    metrics = ResourceManager.get_metrics(100)
    
    assert metrics.dataset_size == 100
    assert metrics.cpu_usage >= 0.0
    assert metrics.ram_usage >= 0.0

def test_health_monitor():
    bus = EventBus()
    # Publish mock events
    bus.publish("WorkflowCompleted", {}, dataset_id="test_health_ds")
    
    health = HealthMonitor.evaluate_health("test_health_ds")
    assert health["status"] == "healthy"
    assert health["total_events"] > 0

def test_orchestrator_end_to_end(mock_df):
    CheckpointManager.clear_checkpoints("test_orch_ds")
    
    result = AIOrchestrator.run("test_orch_ds", mock_df)
    assert isinstance(result, OrchestratorResult)
    assert result.status == "completed"
    assert result.analyst_result is not None
    assert result.business_result is not None
    assert result.strategy_result is not None
    assert result.executive_result is not None
