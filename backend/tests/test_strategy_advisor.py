import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from backend.services.data_engineer import AIDataEngineer
from backend.services.data_analyst.analyst import AIDataAnalyst
from backend.services.business_analyst.analyst import AIBusinessAnalyst
from backend.services.strategy_advisor import (
    AIStrategyAdvisor,
    DecisionMatrixEngine,
    ScenarioPlannerEngine,
    WhatIfAnalysisEngine,
    ActionPlannerEngine,
    RoadmapGeneratorEngine,
    ExecutiveReportBuilder,
    PresentationBuilderEngine,
    StrategyReasoningEngine,
    StrategyAdvisorResult
)
from backend.services.intelligence.memory import SharedProjectMemory

@pytest.fixture
def mock_business_data():
    """Generates synthetic dataset and certified/analyzed/strategy metadata."""
    np.random.seed(42)
    rows = 50
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(rows)]
    
    # Generate declining revenue
    revenue = [500.0 - 4.0 * i + np.random.normal(0, 0.1) for i in range(rows)]
    revenue[40] = 100.0
    
    category = ["Electronics" if i % 2 == 0 else "Clothing" for i in range(rows)]
    sales = []
    for i in range(rows):
        if category[i] == "Electronics":
            sales.append(1000.0 + np.random.normal(0, 1.0))
        else:
            sales.append(100.0 + np.random.normal(0, 1.0))
            
    quantity = [10 - i % 3 for i in range(rows)]
    discount = [0.05 for _ in range(rows)]
    
    df = pd.DataFrame({
        "order_date": [d.strftime("%Y-%m-%d") for d in dates],
        "revenue_val": revenue,
        "sales_val": sales,
        "quantity": quantity,
        "discount_pct": discount,
        "category": category
    })

    certified = AIDataEngineer.certify_and_clean(df, dataset_id="test_strat_ds")
    
    # Cache trusted dataset
    mem = SharedProjectMemory()
    mem.set_metadata("test_strat_ds", "trusted_dataset", certified.metadata)
    
    analyst_res = AIDataAnalyst.analyze_trusted_dataset(certified.metadata, certified.dataframe)
    biz_res = AIBusinessAnalyst.analyze_business("test_strat_ds", certified.metadata, analyst_res)
    
    return certified.metadata, biz_res, certified.dataframe

def test_decision_matrix(mock_business_data):
    trusted_ds, biz_res, _ = mock_business_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    matrix = DecisionMatrixEngine.build_matrix(biz_res.recommendations, biz_res.risks, dq_conf)
    assert len(matrix.decisions) > 0
    assert matrix.decisions[0].priority_score >= 0.0
    assert matrix.decisions[0].priority_level in ["Critical", "High", "Medium", "Low"]
    assert matrix.decisions[0].execution_order == 1

def test_scenario_planning(mock_business_data):
    trusted_ds, biz_res, _ = mock_business_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    scenarios = ScenarioPlannerEngine.generate_scenarios(biz_res.recommendations, dq_conf)
    assert len(scenarios) == 3
    types = [s.scenario_type for s in scenarios]
    assert "Conservative" in types
    assert "Balanced" in types
    assert "Aggressive" in types
    assert scenarios[0].confidence > 0.0

def test_what_if_analysis(mock_business_data):
    trusted_ds, _, _ = mock_business_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    sims = WhatIfAnalysisEngine.run_simulations(trusted_ds, dq_conf)
    assert len(sims) > 0
    assert sims[0].simulation_type in ["price_increase", "marketing_increase", "cost_reduction"]
    assert len(sims[0].assumptions) > 0

def test_action_and_roadmap_planner(mock_business_data):
    trusted_ds, biz_res, _ = mock_business_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    actions = ActionPlannerEngine.generate_action_plans(biz_res.recommendations, dq_conf)
    assert len(actions) > 0
    assert actions[0].milestone in ["Immediate", "30 Days", "90 Days", "6 Months", "12 Months"]
    
    roadmap = RoadmapGeneratorEngine.generate_roadmap(actions, dq_conf)
    assert len(roadmap.milestones) > 0
    assert roadmap.roadmap_id != ""

def test_executive_report_and_presentation(mock_business_data):
    trusted_ds, biz_res, _ = mock_business_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    actions = ActionPlannerEngine.generate_action_plans(biz_res.recommendations, dq_conf)
    roadmap = RoadmapGeneratorEngine.generate_roadmap(actions, dq_conf)
    
    report = ExecutiveReportBuilder.build_report("test_strat_ds", biz_res, roadmap, dq_conf)
    assert report.executive_summary != ""
    assert report.roadmap_summary != ""
    
    pres = PresentationBuilderEngine.build_presentation("test_strat_ds", biz_res, dq_conf)
    assert len(pres.slides) >= 5
    assert pres.slides[0].title != ""

def test_strategy_advisor_orchestrator(mock_business_data):
    trusted_ds, biz_res, _ = mock_business_data
    
    result = AIStrategyAdvisor.generate_strategy("test_strat_ds", biz_res)
    assert isinstance(result, StrategyAdvisorResult)
    assert result.dataset_id == "test_strat_ds"
    assert len(result.scenarios) > 0
    assert len(result.action_plans) > 0
    assert result.overall_validation_status in ["valid", "warning"]
    
    # Verify memory caching
    mem = SharedProjectMemory()
    cached_res = mem.get_metadata("test_strat_ds", "strategy_result")
    cached_graph = mem.get_metadata("test_strat_ds", "strategy_reasoning_graph")
    
    assert cached_res is not None
    assert cached_graph is not None
    assert len(cached_graph.nodes) > 0
