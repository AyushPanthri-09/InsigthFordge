import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from backend.services.data_engineer import AIDataEngineer
from backend.services.data_analyst.analyst import AIDataAnalyst
from backend.services.business_analyst.analyst import AIBusinessAnalyst
from backend.services.strategy_advisor.advisor import AIStrategyAdvisor
from backend.services.executive_communicator import (
    AIExecutiveCommunicator,
    ExecutiveValidator,
    NarrativeEngine,
    AudienceAdapterEngine,
    ExecutiveSummaryBuilder,
    DashboardStorytellingEngine,
    ReportBuilderEngine,
    PresentationBuilderEngine,
    CommunicationBuilderEngine,
    CommunicationReasoningEngine,
    ExecutiveCommunicatorResult
)
from backend.services.intelligence.memory import SharedProjectMemory

@pytest.fixture
def mock_strategy_data():
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

    certified = AIDataEngineer.certify_and_clean(df, dataset_id="test_comm_ds")
    
    # Cache trusted dataset
    mem = SharedProjectMemory()
    mem.set_metadata("test_comm_ds", "trusted_dataset", certified.metadata)
    
    analyst_res = AIDataAnalyst.analyze_trusted_dataset(certified.metadata, certified.dataframe)
    biz_res = AIBusinessAnalyst.analyze_business("test_comm_ds", certified.metadata, analyst_res)
    strat_res = AIStrategyAdvisor.generate_strategy("test_comm_ds", biz_res)
    
    return certified.metadata, analyst_res, biz_res, strat_res, certified.dataframe

def test_narrative_engine():
    res = NarrativeEngine.compile_narrative("Revenue is down.", "Pricing shifts.", "Recover margins.")
    assert "Revenue is down" in res
    assert "Pricing shifts" in res
    
    empty_res = NarrativeEngine.compile_narrative("", "", "")
    assert empty_res == "No validated narrative can be generated for this section."

def test_audience_adapter(mock_strategy_data):
    trusted_ds, _, biz_res, _, _ = mock_strategy_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    reports = AudienceAdapterEngine.generate_audience_reports(biz_res, dq_conf)
    assert len(reports) == 4
    audiences = [r.audience_type for r in reports]
    assert "CEO" in audiences
    assert "Investors" in audiences
    assert "Operations" in audiences
    assert "Technical Teams" in audiences
    assert reports[0].tone_narrative != ""

def test_executive_summary_builder(mock_strategy_data):
    trusted_ds, _, biz_res, strat_res, _ = mock_strategy_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    summary = ExecutiveSummaryBuilder.build_summary(biz_res, strat_res, dq_conf)
    assert summary.summary_id != ""
    assert "gross profitability" in summary.highest_priority_recommendation or "VP" in summary.highest_priority_recommendation
    assert len(summary.key_findings) > 0
    assert summary.business_impact != ""

def test_dashboard_storytelling(mock_strategy_data):
    trusted_ds, _, biz_res, strat_res, _ = mock_strategy_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    stories = DashboardStorytellingEngine.generate_narratives(biz_res, strat_res, dq_conf)
    assert stories.narrative_id != ""
    assert len(stories.kpi_narratives) > 0
    assert len(stories.chart_narratives) > 0

def test_report_builder(mock_strategy_data):
    trusted_ds, _, biz_res, strat_res, _ = mock_strategy_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    report = ReportBuilderEngine.build_report("test_comm_ds", biz_res, strat_res, dq_conf)
    assert report.report_id != ""
    assert "# Executive Performance Report:" in report.markdown_content
    assert report.dataset_overview != ""

def test_presentation_builder(mock_strategy_data):
    trusted_ds, _, biz_res, strat_res, _ = mock_strategy_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    pres = PresentationBuilderEngine.build_presentation("test_comm_ds", biz_res, strat_res, dq_conf)
    assert len(pres.slides) == 10
    assert pres.slides[0].title == "Strategic Executive Presentation"
    assert pres.slides[0].speaker_notes != ""
    assert pres.slides[9].title == "Appendix"

def test_communication_builder(mock_strategy_data):
    trusted_ds, _, biz_res, strat_res, _ = mock_strategy_data
    dq_conf = float(trusted_ds.quality_report.quality_score.trust_score) / 100.0
    
    bundle = CommunicationBuilderEngine.build_communications("test_comm_ds", biz_res, strat_res, dq_conf)
    assert bundle.email.subject != ""
    assert bundle.meeting_brief.agenda_topics[0] != ""
    assert bundle.slack_summary != ""

def test_communicator_orchestrator(mock_strategy_data):
    trusted_ds, analyst_res, biz_res, strat_res, _ = mock_strategy_data
    
    result = AIExecutiveCommunicator.generate_reports(
        "test_comm_ds", trusted_ds, analyst_res, biz_res, strat_res
    )
    assert isinstance(result, ExecutiveCommunicatorResult)
    assert result.dataset_id == "test_comm_ds"
    assert result.executive_summary.summary_id != ""
    assert len(result.audience_reports) == 4
    
    # Memory validation
    mem = SharedProjectMemory()
    cached_res = mem.get_metadata("test_comm_ds", "executive_result")
    cached_graph = mem.get_metadata("test_comm_ds", "communication_reasoning_graph")
    
    assert cached_res is not None
    assert cached_graph is not None
    assert len(cached_graph.nodes) > 0
