import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from backend.services.analytics.validator import DatasetValidationEngine
from backend.services.analytics.cleaner import DatasetCleaningEngine
from backend.services.analytics.profiler import DatasetProfilingEngine
from backend.services.analytics.eda import DatasetEDAPerformer
from backend.services.analytics.statistics import StatisticalAnalysisEngine
from backend.services.analytics.anomaly import AnomalyDetectionEngine
from backend.services.analytics.root_cause import RootCauseAnalysisEngine
from backend.services.analytics.forecasting import ForecastingEngine
from backend.services.analytics.recommendations import RecommendationEngine
from backend.services.analytics.report_engine import ExecutiveReportEngine

@pytest.fixture
def sample_dataframe():
    """Generates a clean synthetic business dataframe for testing."""
    np.random.seed(42)
    rows = 100
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(rows)]
    
    # 95 random values + 5 outliers
    revenue = np.random.normal(500, 50, rows)
    revenue[10] = 1500  # extreme outlier
    revenue[20] = 1600  # extreme outlier
    revenue[30] = 50    # extreme low outlier
    
    quantity = np.random.randint(10, 50, rows)
    
    categories = ["North", "South", "East", "West"]
    region = np.random.choice(categories, rows)
    
    df = pd.DataFrame({
        "order_date": dates,
        "revenue": revenue,
        "quantity": quantity,
        "region": region,
        "duplicate_col": [1.0] * rows  # Constant column
    })
    
    # Add a couple of NaNs
    df.loc[5, "revenue"] = np.nan
    df.loc[15, "quantity"] = np.nan
    return df

def test_validation_engine(sample_dataframe):
    # Test valid dataframe
    report = DatasetValidationEngine.run_validation(sample_dataframe)
    assert report["status"] in ["valid", "warning"]
    assert any("val_constant_col" in issue["id"] for issue in report["issues"])
    
    # Test empty dataframe
    empty_df = pd.DataFrame()
    report_empty = DatasetValidationEngine.run_validation(empty_df)
    assert report_empty["status"] == "invalid"
    assert any(issue["id"] == "val_empty" for issue in report_empty["issues"])

def test_cleaning_engine(sample_dataframe):
    # Should clip outliers and impute NaNs
    cleaned_df, cleaning_log = DatasetCleaningEngine.clean_dataset(sample_dataframe)
    
    # Check that nulls are imputed
    assert cleaned_df["revenue"].isnull().sum() == 0
    assert cleaned_df["quantity"].isnull().sum() == 0
    
    # Check outlier clipping occurred
    assert cleaned_df["revenue"].max() < 1200
    assert any(log["action"] == "clip_outliers" for log in cleaning_log)

def test_profiling_engine(sample_dataframe):
    profile = DatasetProfilingEngine.profile_dataset(sample_dataframe)
    assert profile["rowCount"] == 100
    assert profile["columnCount"] == 5
    
    # Verify column role mapping
    cols_meta = {c["name"]: c for c in profile["columns"]}
    assert cols_meta["revenue"]["role"] == "measure"
    assert cols_meta["region"]["role"] == "dimension"

def test_eda_performer(sample_dataframe):
    numeric = ["revenue", "quantity"]
    categorical = ["region"]
    datetimes = ["order_date"]
    
    eda = DatasetEDAPerformer.generate_eda(sample_dataframe, numeric, categorical, datetimes)
    assert "correlations" in eda
    assert "charts" in eda
    assert len(eda["insights"]) > 0

def test_statistical_engine(sample_dataframe):
    # Test Normality
    res = StatisticalAnalysisEngine.test_normality(sample_dataframe["revenue"])
    assert "test" in res
    
    # Test Compare Groups (ANOVA/Kruskal)
    compare = StatisticalAnalysisEngine.compare_groups(sample_dataframe, "revenue", "region")
    assert "test" in compare
    assert "interpretation" in compare

def test_anomaly_detection(sample_dataframe):
    anoms = AnomalyDetectionEngine.detect_anomalies(sample_dataframe, ["revenue", "quantity"], ["order_date"])
    assert len(anoms) > 0
    assert any(anom["type"] == "univariate_outlier" for anom in anoms)

def test_root_cause_analysis(sample_dataframe):
    anoms = AnomalyDetectionEngine.detect_anomalies(sample_dataframe, ["revenue", "quantity"], ["order_date"])
    rc = RootCauseAnalysisEngine.analyze_root_causes(sample_dataframe, anoms, ["revenue", "quantity"], ["region"])
    assert len(rc) > 0
    assert "probableCause" in rc[0]

def test_forecasting_engine(sample_dataframe):
    fc = ForecastingEngine.generate_forecasts(sample_dataframe, ["order_date"], ["revenue", "quantity"])
    assert "revenue" in fc
    assert "nextPeriods" in fc["revenue"]
    assert len(fc["revenue"]["nextPeriods"]) == 3

def test_recommendation_engine(sample_dataframe):
    report = DatasetValidationEngine.run_validation(sample_dataframe)
    anoms = AnomalyDetectionEngine.detect_anomalies(sample_dataframe, ["revenue", "quantity"], ["order_date"])
    recs = RecommendationEngine.generate_recommendations(report, anoms, [])
    assert len(recs) > 0
    assert "action" in recs[0]

def test_full_pipeline_orchestrator(sample_dataframe):
    res = ExecutiveReportEngine.run_full_pipeline(sample_dataframe, "test_file.csv", "test_id")
    assert "dataset" in res
    assert "quality" in res
    assert "profile" in res
    assert "kpis" in res
    assert "narrative" in res
    assert res["dataset"]["rowCount"] == 100
