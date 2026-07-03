import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from backend.services.orchestrator.orchestrator import AIOrchestrator
from backend.services.platform_intelligence.supervisor import AIPlatformSupervisor
from backend.services.platform_operations import (
    AIPlatformOperations,
    DeploymentManager,
    SchedulerEngine,
    ModelRegistryManager,
    ExperimentTrackerEngine,
    BenchmarkEngine,
    SecurityManager,
    AccessControlManager,
    ConfigurationManager,
    PlatformBackupManager,
    PlatformRecoveryManager,
    PlatformObservability,
    PlatformMetricsEngine,
    OperationsValidator,
    PlatformOperationsResult
)
from backend.services.intelligence.memory import SharedProjectMemory

@pytest.fixture
def mock_platform_result():
    """Generates synthetic dataset and certified/analyzed/strategy/governance metadata."""
    np.random.seed(42)
    rows = 20
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(rows)]
    
    df = pd.DataFrame({
        "order_date": [d.strftime("%Y-%m-%d") for d in dates],
        "revenue_val": [100.0 - i + np.random.normal(0, 0.1) for i in range(rows)],
        "sales_val": [50.0 + np.random.normal(0, 1.0) for _ in range(rows)]
    })

    # Cache dummy trusted dataset
    mem = SharedProjectMemory()
    from backend.services.data_engineer.contracts import TrustedDataset, QualityReport, QualityScore, Certification
    trusted_ds = TrustedDataset(
        dataset_id="test_ops_ds",
        row_count=rows,
        column_count=3,
        columns=["order_date", "revenue_val", "sales_val"],
        column_dictionary={},
        quality_report=QualityReport(
            dataset_id="test_ops_ds",
            quality_score=QualityScore(
                score=95.0,
                level="Good",
                completeness=1.0,
                integrity=1.0,
                schema_quality=1.0,
                trust_score=95.0
            )
        ),
        certification=Certification(
            status="certified",
            overall_score=95.0,
            level="Good",
            explanation="Data clean"
        )
    )
    mem.set_metadata("test_ops_ds", "trusted_dataset", trusted_ds)

    orch_res = AIOrchestrator.run("test_ops_ds", df)
    plat_res = AIPlatformSupervisor.supervise("test_ops_ds", orch_res)
    return plat_res, df

def test_deployment_manager():
    dep = DeploymentManager.create_deployment("v1.0.0", "production")
    assert dep.version == "v1.0.0"
    assert dep.environment == "production"
    assert dep.status == "active"
    assert DeploymentManager.rollback_deployment(dep.deployment_id) is True

def test_scheduler_jobs():
    job = SchedulerEngine.create_job("weekly")
    assert job.schedule_type == "weekly"
    assert job.active is True
    assert job.last_run != ""

def test_model_registry():
    entry = ModelRegistryManager.get_entry("AI Strategy Advisor")
    assert entry.module_name == "AI Strategy Advisor"
    assert entry.version == "v5.1.0"
    assert entry.health == "healthy"

def test_experiment_tracker():
    record = ExperimentTrackerEngine.log_experiment({"alpha": 0.1}, runtime=5.5, success_rate=0.95)
    assert record.experiment_id != ""
    assert record.benchmark_score > 0.0
    assert record.success_rate == 0.95

def test_benchmark_engine():
    res = BenchmarkEngine.run_benchmark(latency=4.0, cpu_usage=20.0, ram_usage=30.0)
    assert res.score > 0.0
    assert res.cache_hit_rate == 0.85

def test_security_and_rbac():
    policy = SecurityManager.verify_security()
    assert policy.encrypted is True
    assert len(policy.authorization_rules) > 0
    
    assert AccessControlManager.authorize_action("Administrator", "admin") is True
    assert AccessControlManager.authorize_action("Viewer", "admin") is False

def test_configuration_manager():
    profile = ConfigurationManager.get_profile()
    assert profile.retry_policy["max_retries"] == 3
    assert profile.resource_limits["max_cpu_percent"] == 90.0

def test_backup_and_recovery():
    mem = SharedProjectMemory()
    mem.set_metadata("test_ops_ds", "last_checkpoint", "Data Engineer")
    
    snapshot = PlatformBackupManager.create_backup("test_ops_ds")
    assert snapshot.snapshot_id != ""
    assert snapshot.hash_code != ""
    
    recovery = PlatformRecoveryManager.restore_from_backup("test_ops_ds", snapshot)
    assert recovery.restored is True

def test_observability_and_metrics():
    obs = PlatformObservability.get_observability("test_ops_ds", latency=4.2)
    assert obs.active_workflows >= 0
    assert obs.failed_runs >= 0
    
    metrics = PlatformMetricsEngine.get_metrics("test_ops_ds")
    assert metrics.availability == 99.9
    assert metrics.success_rate >= 0.0

def test_operations_validator():
    dep = DeploymentManager.create_deployment("v1.0.0", "production")
    job = SchedulerEngine.create_job("daily")
    entry = ModelRegistryManager.get_entry("AI Strategy Advisor")
    bench = BenchmarkEngine.run_benchmark(latency=120.0, cpu_usage=95.0, ram_usage=30.0) # low score
    sec = SecurityManager.verify_security()
    obs = PlatformObservability.get_observability("test_ops_ds", latency=10.0)
    metrics = PlatformMetricsEngine.get_metrics("test_ops_ds")

    res = PlatformOperationsResult(
        dataset_id="test_ops_ds",
        deployment_record=dep,
        scheduler_job=job,
        registry_entry=entry,
        benchmark_result=bench,
        security_policy=sec,
        observability_metrics=obs,
        operations_metrics=metrics
    )
    
    validated = OperationsValidator.validate_operations(res)
    assert validated.overall_validation_status == "warning"

def test_operations_orchestrator(mock_platform_result):
    plat_res, _ = mock_platform_result
    
    result = AIPlatformOperations.run("test_ops_ds", plat_res)
    assert isinstance(result, PlatformOperationsResult)
    assert result.dataset_id == "test_ops_ds"
    assert result.benchmark_result.score > 0.0
    
    # Memory validation
    mem = SharedProjectMemory()
    cached_res = mem.get_metadata("test_ops_ds", "operations_result")
    cached_graph = mem.get_metadata("test_ops_ds", "platform_operations_reasoning_graph")
    
    assert cached_res is not None
    assert cached_graph is not None
    assert len(cached_graph.nodes) > 0
