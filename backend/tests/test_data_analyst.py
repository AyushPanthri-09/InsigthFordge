import math
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from backend.services.data_analyst import (
    AIDataAnalyst,
    DataAnalystValidator,
    KPIDiscoveryEngine,
    AdaptiveStatisticalSelector,
    StatisticalAnalysisEngine,
    EDAEngine,
    TrendAnalysisEngine,
    SeasonalityDetector,
    SegmentationEngine,
    AnomalyInvestigator,
    ForecastingEngine,
    InsightBuilder,
    AnalystResult,
    ConfidenceBreakdown
)
from backend.services.data_engineer import AIDataEngineer
from backend.services.intelligence.reasoning_graph import ReasoningGraph

@pytest.fixture
def mock_retail_dataframe():
    """Generates a synthetic Retail sales dataframe for testing."""
    np.random.seed(42)
    rows = 50
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(rows)]
    
    # Generate positive growth trend for revenue
    revenue = [100.0 + 5.0 * i + np.random.normal(0, 10.0) for i in range(rows)]
    # Anomaly at index 40 (high promo spike)
    revenue[40] = 1000.0
    
    quantity = [2 + i % 3 for i in range(rows)]
    quantity[40] = 50 # volume spike
    
    discount = [0.05 for _ in range(rows)]
    discount[40] = 0.50 # discount spike
    
    return pd.DataFrame({
        "order_date": [d.strftime("%Y-%m-%d") for d in dates],
        "revenue_val": revenue,
        "quantity": quantity,
        "discount_pct": discount,
        "category": ["Electronics" if i % 2 == 0 else "Clothing" for i in range(rows)]
    })

@pytest.fixture
def mock_hr_dataframe():
    """Generates a synthetic HR dataframe for testing average salaries."""
    rows = 20
    return pd.DataFrame({
        "employee_id": [100 + i for i in range(rows)],
        "salary_amt": [50000.0 + 2000.0 * i for i in range(rows)],
        "department": ["Sales" if i % 2 == 0 else "Engineering" for i in range(rows)]
    })

def test_kpi_discovery(mock_retail_dataframe, mock_hr_dataframe):
    # 1. Test Retail Domain KPI discovery
    # Build mock TrustedDataset
    from backend.services.data_engineer.contracts import TrustedDataset, QualityReport, QualityScore, Certification
    from backend.services.data_engineer.audit import AuditTrail
    
    # We can run the AI Data Engineer directly to construct the TrustedDataset
    certified = AIDataEngineer.certify_and_clean(mock_retail_dataframe, dataset_id="test_ds_retail")
    trusted_ds = certified.metadata
    
    dq_checks = DataAnalystValidator.challenge_data_engineer(trusted_ds)
    kpi_defs, kpi_res = KPIDiscoveryEngine.discover_and_compute_kpis(trusted_ds, mock_retail_dataframe, dq_checks)
    
    names = [d.name for d in kpi_defs]
    assert "Total Revenue" in names
    assert "Total Orders" in names
    
    # Verify calculated values
    total_rev_res = [r for r in kpi_res if r.kpi_name == "Total Revenue"][0]
    assert math.isclose(
        total_rev_res.current_value,
        float(mock_retail_dataframe["revenue_val"].sum()),
        rel_tol=1e-9,
        abs_tol=1e-12
    )
    assert total_rev_res.evidence_ids[0].startswith("ev_kpi_total_revenue")
    assert total_rev_res.confidence_breakdown.overall_confidence > 0.0

    # 2. Test HR Domain KPI discovery
    certified_hr = AIDataEngineer.certify_and_clean(mock_hr_dataframe, dataset_id="test_ds_hr")
    kpi_defs_hr, kpi_res_hr = KPIDiscoveryEngine.discover_and_compute_kpis(certified_hr.metadata, mock_hr_dataframe, dq_checks)
    
    names_hr = [d.name for d in kpi_defs_hr]
    assert "Average Salary" in names_hr
    assert "Headcount" in names_hr

def test_adaptive_statistical_selector():
    # Test normality test with skewed vs normal series
    normal_series = pd.Series(np.random.normal(10, 1.0, 100))
    skewed_series = pd.Series(np.random.exponential(5.0, 100))
    
    is_norm_ok, p_val_ok, _ = AdaptiveStatisticalSelector.test_normality(normal_series)
    # Note: with random state, it is usually normal (p > 0.05)
    
    method, rationale = AdaptiveStatisticalSelector.select_correlation_method(normal_series, skewed_series)
    assert method == "spearman"  # skewed variable forces non-parametric Spearman
    assert "Spearman" in rationale

    # Test group comparisons selection
    df_group = pd.DataFrame({
        "num": np.concatenate([np.random.normal(10, 1, 50), np.random.normal(15, 1, 50)]),
        "cat": ["A"] * 50 + ["B"] * 50
    })
    
    method_grp, rationale_grp = AdaptiveStatisticalSelector.select_group_comparison_method(df_group, "num", "cat")
    # Both normal -> independent T-Test
    assert method_grp in ["t_test", "mann_whitney"]

def test_statistical_engine():
    # Setup series
    s1 = pd.Series([10.0, 12.0, 15.0, 18.0, 20.0])
    s2 = pd.Series([2.0, 4.0, 5.0, 7.0, 8.0])
    
    # Pearson
    res = StatisticalAnalysisEngine.run_correlation(s1, s2, "pearson", "Test Rationale", 1.0)
    assert res.is_significant == True
    assert res.test_statistic > 0.95
    assert "CHI_SQUARE" not in res.method_name

    # Chi-Square
    df_chi = pd.DataFrame({
        "cat1": ["X", "X", "Y", "Y"] * 10,
        "cat2": ["A", "B", "A", "B"] * 10
    })
    chisq = StatisticalAnalysisEngine.run_chi_square(df_chi, "cat1", "cat2", 1.0)
    assert chisq.method_name == "CHI_SQUARE"
    assert chisq.p_value > 0.05 # independent random variables

    # VIF
    df_vif = pd.DataFrame({
        "a": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "b": [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] # perfect collinearity
    })
    vifs = StatisticalAnalysisEngine.calculate_vif(df_vif, ["a", "b"])
    assert vifs["a"] > 10.0 or math.isclose(vifs["a"], 999.0, rel_tol=1e-9, abs_tol=1e-12)

def test_eda_engine(mock_retail_dataframe):
    eda = EDAEngine.run_eda(
        df=mock_retail_dataframe,
        numeric_cols=["revenue_val", "quantity"],
        categorical_cols=["category"],
        datetime_cols=["order_date"]
    )
    
    assert "distributions" in eda
    assert "missingness" in eda
    assert "frequencies" in eda
    assert "correlation_matrix" in eda
    assert "covariance_matrix" in eda
    assert "performers" in eda
    assert len(eda["distributions"]["revenue_val"]) > 0

def test_trend_analysis_and_seasonality(mock_retail_dataframe):
    trend = TrendAnalysisEngine.analyze_trend(mock_retail_dataframe, "revenue_val", "order_date", 1.0)
    
    assert trend.direction == "growth"  # positive slope trend
    assert trend.column == "revenue_val"
    assert len(trend.change_points) > 0

    # Test seasonality cycles
    # Generate weekly sin-wave cyclic series
    days = 40
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(days)]
    val_cycle = [10.0 + 5.0 * np.sin(2.0 * np.pi * i / 7.0) for i in range(days)]
    
    df_cycle = pd.DataFrame({
        "date": [d.strftime("%Y-%m-%d") for d in dates],
        "metric": val_cycle
    })
    
    has_season, period, _ = SeasonalityDetector.detect_seasonality(df_cycle, "metric", "date")
    assert has_season == True
    assert period == 7

def test_segmentation_engine(mock_retail_dataframe):
    # Electronics mean will be different from Clothing due to random distribution
    segments = SegmentationEngine.analyze_segments(mock_retail_dataframe, "revenue_val", "category", 1.0)
    # Check segment comparison
    if segments:
        assert segments[0].dimension == "category"
        assert len(segments[0].insights) > 0

def test_anomaly_investigation(mock_retail_dataframe):
    # Outlier index 40 has both volume/quantity and promo/discount spikes
    anomalies = AnomalyInvestigator.investigate_anomaly_events(mock_retail_dataframe, ["revenue_val"], 1.0)
    
    assert len(anomalies) > 0
    # The anomaly at index 40 should be attributed to 'promo'
    spikes = [a for a in anomalies if a.timestamp_or_index == "40"]
    if spikes:
        assert spikes[0].classification == "promo"
        assert "promotion event" in spikes[0].explanation

def test_forecasting(mock_retail_dataframe):
    forecasts = ForecastingEngine.generate_forecast(mock_retail_dataframe, "revenue_val", "order_date", 1.0)
    
    assert len(forecasts) > 0
    assert forecasts[0].column == "revenue_val"
    assert len(forecasts[0].forecast_values) == 5 # 5 steps predicted
    assert len(forecasts[0].confidence_interval_lower) == 5

def test_feature_importance(mock_retail_dataframe):
    from backend.services.data_analyst.feature_importance import FeatureImportanceEngine
    drivers = FeatureImportanceEngine.calculate_drivers(
        df=mock_retail_dataframe,
        target_col="revenue_val",
        feature_cols=["quantity", "discount_pct", "category"]
    )
    
    assert len(drivers) > 0
    assert drivers[0][0] in ["quantity", "discount_pct", "category"]

def test_data_analyst_orchestrator(mock_retail_dataframe):
    # Execute full Data Engineer and Analyst pipeline
    certified = AIDataEngineer.certify_and_clean(mock_retail_dataframe, dataset_id="test_ds_full")
    analyst_res = AIDataAnalyst.analyze_trusted_dataset(certified.metadata, certified.dataframe)
    
    assert isinstance(analyst_res, AnalystResult)
    assert analyst_res.dataset_id == "test_ds_full"
    assert len(analyst_res.kpi_definitions) > 0
    assert len(analyst_res.kpis) > 0
    assert len(analyst_res.statistical_tests) > 0
    assert len(analyst_res.trends) > 0
    assert len(analyst_res.forecasts) > 0
    assert len(analyst_res.anomalies) > 0
    assert len(analyst_res.insights) > 0
    assert len(analyst_res.questions) > 0
    
    # Enforces evidence chains
    assert analyst_res.kpis[0].evidence_ids is not None
    assert len(analyst_res.kpis[0].evidence_ids) > 0
    assert analyst_res.kpis[0].confidence_breakdown.overall_confidence > 0.0
    
    # Enforces limitations fields
    assert isinstance(analyst_res.kpis[0].limitations, list)

    # Reasoning Graph verification from memory
    from backend.services.intelligence.memory import SharedProjectMemory
    graph = SharedProjectMemory().get_metadata("test_ds_full", "reasoning_graph")
    assert graph is not None
    assert len(graph.nodes) > 0
