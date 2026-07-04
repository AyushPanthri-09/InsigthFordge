import math
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from backend.services.orchestrator.orchestrator import AIOrchestrator
from backend.services.platform_intelligence import (
    AIPlatformSupervisor,
    PlatformValidator,
    GovernanceEngine,
    ExplainabilityEngine,
    PlatformAuditLogger,
    KnowledgeBaseEngine,
    ContinuousLearningEngine,
    PlatformIntelligenceResult
)
from backend.services.intelligence.memory import SharedProjectMemory

@pytest.fixture
def mock_orch_result():
    """Generates synthetic dataset and certified/analyzed/strategy metadata."""
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
        dataset_id="test_plat_ds",
        row_count=rows,
        column_count=3,
        columns=["order_date", "revenue_val", "sales_val"],
        column_dictionary={},
        quality_report=QualityReport(
            dataset_id="test_plat_ds",
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
            explanation="Dataset clean"
        )
    )
    mem.set_metadata("test_plat_ds", "trusted_dataset", trusted_ds)

    result = AIOrchestrator.run("test_plat_ds", df)
    return result, df

def test_explainability_engine(mock_orch_result):
    orch_res, _ = mock_orch_result
    exp = ExplainabilityEngine.generate_explainability(orch_res, 0.95)
    
    assert exp.algorithm_details != ""
    assert "revenue_val" in exp.feature_attributions
    assert exp.feature_attributions["revenue_val"] > 0.0

def test_governance_engine(mock_orch_result):
    orch_res, _ = mock_orch_result
    gov = GovernanceEngine.audit_governance("test_plat_ds", orch_res, 0.95)
    
    assert gov.compliance_status == "certified"
    assert gov.audit_trail_hash != ""
    assert len(gov.lineage_trail) > 0

def test_platform_audit_logger():
    record = PlatformAuditLogger.log_action(
        dataset_id="test_plat_ds",
        action="test_action",
        agent_name="TestSupervisor",
        output_content="deliverable content",
        reasoning_path="audit logic"
    )
    
    assert record.agent_name == "TestSupervisor"
    assert record.output_hash != ""
    
    # Verify cached in memory
    mem = SharedProjectMemory()
    trail = mem.get_metadata("test_plat_ds", "platform_audit_trail")
    assert len(trail) > 0
    assert trail[-1]["action"] == "test_action"

def test_knowledge_base():
    catalog = KnowledgeBaseEngine.get_catalog(0.95)
    assert len(catalog.defined_rules) > 0
    assert "revenue_val" in catalog.business_glossary

def test_continuous_learning():
    mem = SharedProjectMemory()
    mem.set_metadata("test_plat_ds", "workflow_history", [{"status": "completed"}])
    
    learning = ContinuousLearningEngine.optimize_parameters("test_plat_ds", 0.95)
    assert learning.learning_iterations == 1
    assert math.isclose(learning.optimized_thresholds["retry_delay_seconds"], 0.75, rel_tol=1e-9, abs_tol=1e-12)
    assert learning.accuracy_improvement > 0.0

def test_platform_validator(mock_orch_result):
    orch_res, _ = mock_orch_result
    gov = GovernanceEngine.audit_governance("test_plat_ds", orch_res, 0.95)
    exp = ExplainabilityEngine.generate_explainability(orch_res, 0.95)
    learning = ContinuousLearningEngine.optimize_parameters("test_plat_ds", 0.95)
    
    res = PlatformIntelligenceResult(
        dataset_id="test_plat_ds",
        overall_governance_score=60.0, # triggers warning limit
        explainability_report=exp,
        governance_report=gov,
        audit_records=[],
        learning_metrics=learning
    )
    
    validated = PlatformValidator.validate_platform(res)
    assert validated.overall_validation_status == "warning"
    assert any("compliance audit score" in limit for limit in validated.global_limitations)

def test_supervisor_orchestrator(mock_orch_result):
    orch_res, _ = mock_orch_result
    
    result = AIPlatformSupervisor.supervise("test_plat_ds", orch_res)
    assert isinstance(result, PlatformIntelligenceResult)
    assert result.dataset_id == "test_plat_ds"
    assert math.isclose(result.overall_governance_score, 100.0, rel_tol=1e-9, abs_tol=1e-12)
    
    # Memory validation
    mem = SharedProjectMemory()
    cached_res = mem.get_metadata("test_plat_ds", "platform_result")
    cached_graph = mem.get_metadata("test_plat_ds", "platform_reasoning_graph")
    
    assert cached_res is not None
    assert cached_graph is not None
    assert len(cached_graph.nodes) > 0
