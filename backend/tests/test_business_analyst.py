import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from backend.services.data_engineer import AIDataEngineer
from backend.services.data_analyst.analyst import AIDataAnalyst
from backend.services.business_analyst import (
    AIBusinessAnalyst,
    BusinessAnalystValidator,
    RootCauseAnalyzer,
    HypothesisEngine,
    HypothesisValidator,
    OpportunityDiscoveryEngine,
    RiskAssessmentEngine,
    RecommendationEngine,
    DecisionPrioritizationEngine,
    ExecutiveStoryBuilder,
    BusinessReasoningEngine,
    BusinessAnalystResult,
    BusinessReasoningGraph
)
from backend.services.intelligence.memory import SharedProjectMemory

@pytest.fixture
def mock_analyst_data():
    """Generates synthetic dataset and certified/analyzed metadata."""
    np.random.seed(42)
    rows = 50
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(rows)]
    
    # Generate declining revenue to trigger decline path
    revenue = [500.0 - 4.0 * i + np.random.normal(0, 0.1) for i in range(rows)]
    revenue[40] = 100.0 # Extreme anomaly drop
    
    # Introduce underperforming segment for Clothing in a separate column
    category = ["Electronics" if i % 2 == 0 else "Clothing" for i in range(rows)]
    sales = []
    for i in range(rows):
        if category[i] == "Electronics":
            sales.append(1000.0 + np.random.normal(0, 1.0))
        else:
            sales.append(100.0 + np.random.normal(0, 1.0)) # Clothing underperforms by 90%
            
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

    certified = AIDataEngineer.certify_and_clean(df, dataset_id="test_biz_ds")
    analyst_res = AIDataAnalyst.analyze_trusted_dataset(certified.metadata, certified.dataframe)
    
    return certified.metadata, analyst_res, certified.dataframe

def test_root_cause_analysis(mock_analyst_data):
    trusted_ds, analyst_res, _ = mock_analyst_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    causes = RootCauseAnalyzer.analyze_root_causes(analyst_res, dq_conf)
    assert len(causes) > 0
    assert causes[0].framework_used == "five_whys"
    assert "Why 1:" in causes[0].observation
    assert causes[0].impact_score >= 0.0

def test_hypothesis_generation_and_validation(mock_analyst_data):
    trusted_ds, analyst_res, _ = mock_analyst_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    hypotheses = HypothesisEngine.generate_hypotheses(analyst_res, dq_conf)
    assert len(hypotheses) >= 3
    assert hypotheses[0].proposed_cause in ["pricing_variance", "discount_contraction", "segment_underperformance"]
    
    validated = HypothesisValidator.validate_hypotheses(hypotheses, analyst_res, dq_conf)
    assert len(validated) > 0
    assert validated[0].validation_status == "valid"

def test_opportunity_discovery(mock_analyst_data):
    trusted_ds, analyst_res, _ = mock_analyst_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    opps = OpportunityDiscoveryEngine.discover_opportunities(analyst_res, dq_conf)
    assert len(opps) > 0
    assert opps[0].opportunity_type in ["revenue_increase", "efficiency_improvement"]
    assert opps[0].estimated_roi >= 0.0

def test_risk_assessment(mock_analyst_data):
    trusted_ds, analyst_res, _ = mock_analyst_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    risks = RiskAssessmentEngine.assess_risks(trusted_ds, analyst_res, dq_conf)
    assert len(risks) > 0
    assert risks[0].risk_type in ["data", "financial", "operational"]
    assert risks[0].probability > 0.0
    assert risks[0].severity > 0.0

def test_recommendation_and_prioritization(mock_analyst_data):
    trusted_ds, analyst_res, _ = mock_analyst_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    recs = RecommendationEngine.generate_recommendations(analyst_res, dq_conf)
    assert len(recs) > 0
    assert recs[0].roi >= 0.0
    
    prioritized = DecisionPrioritizationEngine.prioritize_recommendations(recs)
    assert len(prioritized) == len(recs)
    assert prioritized[0].priority_score >= 0.0
    assert prioritized[0].priority_level in ["Critical", "High", "Medium", "Low"]
    assert prioritized[0].rank_position == 1

def test_story_builder(mock_analyst_data):
    trusted_ds, analyst_res, _ = mock_analyst_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    recs = RecommendationEngine.generate_recommendations(analyst_res, dq_conf)
    stories = ExecutiveStoryBuilder.build_narratives(recs)
    assert len(stories) == len(recs)
    assert stories[0].situation != ""
    assert stories[0].finding != ""
    assert stories[0].expected_business_impact != ""

def test_business_reasoning_graph(mock_analyst_data):
    trusted_ds, analyst_res, _ = mock_analyst_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    recs = RecommendationEngine.generate_recommendations(analyst_res, dq_conf)
    prioritized = DecisionPrioritizationEngine.prioritize_recommendations(recs)
    stories = ExecutiveStoryBuilder.build_narratives(recs)
    
    result = BusinessAnalystResult(
        dataset_id="test_ds",
        findings=[],
        root_causes=RootCauseAnalyzer.analyze_root_causes(analyst_res, dq_conf),
        hypotheses=HypothesisValidator.validate_hypotheses(
            HypothesisEngine.generate_hypotheses(analyst_res, dq_conf),
            analyst_res, dq_conf
        ),
        opportunities=OpportunityDiscoveryEngine.discover_opportunities(analyst_res, dq_conf),
        risks=RiskAssessmentEngine.assess_risks(trusted_ds, analyst_res, dq_conf),
        recommendations=recs,
        prioritized_recommendations=prioritized,
        narratives=stories
    )
    
    graph = BusinessReasoningEngine.build_business_graph(result, "test_ds")
    assert isinstance(graph, BusinessReasoningGraph)
    # Check that edges connect correctly
    assert len(graph.edges) > 0
    assert graph.edges[0].relationship_type in ["causes", "validates", "yields", "addresses"]
    assert graph.edges[0].confidence >= 0.0

def test_business_analyst_orchestrator(mock_analyst_data):
    trusted_ds, analyst_res, _ = mock_analyst_data
    
    result = AIBusinessAnalyst.analyze_business("test_biz_ds", trusted_ds, analyst_res)
    assert isinstance(result, BusinessAnalystResult)
    assert result.dataset_id == "test_biz_ds"
    assert len(result.root_causes) > 0
    assert len(result.recommendations) > 0
    assert len(result.prioritized_recommendations) > 0
    assert len(result.narratives) > 0
    
    # Verify memory caching
    mem = SharedProjectMemory()
    cached_res = mem.get_metadata("test_biz_ds", "business_analyst_result")
    cached_graph = mem.get_metadata("test_biz_ds", "business_reasoning_graph")
    
    assert cached_res is not None
    assert cached_graph is not None
    assert len(cached_graph.nodes) > 0
