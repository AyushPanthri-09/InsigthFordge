import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from backend.services.data_engineer import (
    AIDataEngineer,
    CertifiedDatasetEnvelope,
    RollbackManager,
    AuditTrail,
    TrustedDataset,
    QualityReport,
    QualityScore,
    Certification,
    ValidationIssue,
    CleaningDecision,
    CleaningAction,
    AuditEntry,
    MissingValueIntelligence,
    OutlierIntelligence,
    DuplicateIntelligence,
    SchemaValidationEngine,
    BusinessRuleDiscovery,
    EntityResolver,
    NormalizationEngine,
    UnitStandardizer
)

@pytest.fixture
def dirty_dataframe():
    """Generates a dirty synthetic business dataframe for testing."""
    rows = 10
    dates = ["2026-01-01" for _ in range(rows)]
    dates[3] = "invalid_date"
    
    df = pd.DataFrame({
        "order_id": [100 + i for i in range(rows)],
        "cust_name": [" John Doe  ", "John Doe", "Jane Smith", "Jane Smith", "Bob Jones", "bobby jones", "Alice", "Alice", "Charlie", "Charlie"],
        "weight_col": ["10 kg", "500 g", "5 lbs", "2 kg", "1.5 kg", "1500 grams", "10 kg", "10 kg", "200 g", "200 g"],
        "revenue_val": ["$120.00", "$150.00", "-$50.00", "$200.00", "$1,000.00", "$50.00", "$120.00", "$120.00", "$90.00", "$90.00"],
        "is_active": ["yes", "no", "y", "n", "true", "false", "yes", "yes", "no", "no"],
        "order_date": dates,
        "null_col": [None, 10.0, 15.0, 20.0, None, 30.0, 40.0, 50.0, None, 70.0]
    })
    
    # Force some exact duplicates
    df.loc[7] = df.loc[6].copy()
    df.loc[9] = df.loc[8].copy()
    return df

def test_normalization_engine():
    # Whitespace normalization
    s_space = pd.Series(["  hello   ", "world  ", "hello   world"])
    clean_space, changes = NormalizationEngine.normalize_whitespaces(s_space)
    assert clean_space.iloc[0] == "hello"
    assert clean_space.iloc[1] == "world"
    assert clean_space.iloc[2] == "hello world"
    assert changes == 3

    # Boolean normalization
    s_bool = pd.Series(["yes", "no", "Y", "N", "true", "false", "active", "disabled"])
    clean_bool, changes = NormalizationEngine.normalize_booleans(s_bool)
    assert clean_bool.iloc[0] == True
    assert clean_bool.iloc[1] == False
    assert clean_bool.iloc[2] == True
    assert clean_bool.iloc[3] == False
    assert clean_bool.iloc[6] == True
    assert clean_bool.iloc[7] == False
    assert changes == 8

    # Dates normalization
    s_date = pd.Series(["2026-01-01", "02/05/2026", "invalid"])
    clean_date, changes = NormalizationEngine.normalize_dates(s_date)
    assert clean_date.iloc[0].year == 2026
    assert clean_date.iloc[1].day == 5
    assert pd.isna(clean_date.iloc[2])

    # Capitalization normalization
    s_cap = pd.Series(["john doe", "usa", "TEST_STATUS"])
    clean_title, _ = NormalizationEngine.normalize_capitalization(s_cap, "title")
    clean_upper, _ = NormalizationEngine.normalize_capitalization(s_cap, "upper")
    clean_lower, _ = NormalizationEngine.normalize_capitalization(s_cap, "lower")
    assert clean_title.iloc[0] == "John Doe"
    assert clean_upper.iloc[1] == "USA"
    assert clean_lower.iloc[2] == "test_status"

    # Currency normalization
    s_curr = pd.Series(["$120.00", "€1,500.50", "-$50.00", "invalid"])
    clean_curr, changes = NormalizationEngine.normalize_currency_symbols(s_curr)
    assert clean_curr.iloc[0] == 120.0
    assert clean_curr.iloc[1] == 1500.5
    assert clean_curr.iloc[2] == -50.0
    assert changes == 3

def test_unit_standardizer():
    s_weight = pd.Series(["10kg", "500g", "5 lbs", "invalid"])
    clean_weight, changes = UnitStandardizer.standardize_column_units(s_weight, "weight_col")
    assert clean_weight.iloc[0] == 10.0
    assert clean_weight.iloc[1] == 0.5
    assert abs(clean_weight.iloc[2] - 2.26796) < 0.01
    assert changes == 3

    # Non-matching column name
    _, changes_fail = UnitStandardizer.standardize_column_units(s_weight, "random_col")
    assert changes_fail == 0

def test_missing_value_intelligence():
    # Construct DF for missing value tests
    np.random.seed(42)
    rows = 100
    # Use random allocation for MCAR to ensure zero correlation with other columns
    mcar_col = [np.nan if np.random.rand() < 0.1 else 5.0 for i in range(rows)]
    
    # MAR column: missing when category is 'A'
    cat = ["A" if i % 2 == 0 else "B" for i in range(rows)]
    mar_col = [np.nan if cat[i] == "A" and i % 3 == 0 else 10.0 for i in range(rows)]
    
    # MNAR column: high missingness
    mnar_col = [np.nan if i % 5 in [0, 1, 2] else 15.0 for i in range(rows)] # 60% missing
    
    df = pd.DataFrame({
        "mcar": mcar_col,
        "mar": mar_col,
        "cat_val": [1 if c == "A" else 0 for c in cat],
        "mnar": mnar_col
    })
    
    # Test diagnosis
    mech_mcar, _, _ = MissingValueIntelligence.diagnose_missing_values(df, "mcar", "numeric")
    assert mech_mcar == "MCAR"

    mech_mar, _, _ = MissingValueIntelligence.diagnose_missing_values(df, "mar", "numeric")
    assert mech_mar == "MAR"

    mech_mnar, _, _ = MissingValueIntelligence.diagnose_missing_values(df, "mnar", "numeric")
    assert mech_mnar == "MNAR"

    # Test analyze recommendations
    decisions = MissingValueIntelligence.analyze_missingness(df, {})
    dec_types = [d.action_type for d in decisions]
    assert "impute_nulls" in dec_types
    assert "drop_column" in dec_types

def test_outlier_intelligence():
    # Series with outliers
    series = pd.Series([10.0] * 100)
    series.iloc[5] = 1000.0  # extreme high outlier
    series.iloc[10] = -500.0 # extreme low outlier
    
    mask, lower, upper, count = OutlierIntelligence.detect_column_outliers(series)
    assert count == 2
    assert mask.iloc[5] == True
    assert mask.iloc[10] == True
    
    # Outlier classification heuristics
    df = pd.DataFrame({"revenue": series, "quantity": [1] * 100})
    # High Z-score -> Data entry error
    classification, _, _ = OutlierIntelligence.classify_outliers(df, "revenue", mask, lower, upper)
    assert classification in ["Data entry error", "Sensor error", "Business event"]
    
    # Decisions check
    decisions = OutlierIntelligence.analyze_outliers(df)
    assert len(decisions) == 1
    assert decisions[0].column == "revenue"

def test_duplicate_intelligence():
    df = pd.DataFrame({
        "id": [1, 2, 2, 2, 4, 5, 6, 6],
        "name": ["Google", "Apple", "Googl", "Apple", "Microsoft", "Amazon", "Netflix", "Netflix"],
        "val": [10, 20, 20, 20, 30, 40, 50, 50]
    })
    
    # Setup metadata
    from backend.services.intelligence.contracts import ColumnMetadata, Confidence
    cols_meta = {
        "name": ColumnMetadata(
            original_name="name",
            detected_name="Name",
            detected_meaning="Entity Name",
            column_type="categorical",
            business_role="dimension",
            confidence=Confidence(score=0.9, level="HIGH", reasoning="", supporting_evidence=[])
        )
    }

    decisions = DuplicateIntelligence.analyze_duplicates(df, primary_keys=["id"], columns_metadata=cols_meta)
    actions = [d.action_type for d in decisions]
    
    assert "deduplicate_rows" in actions
    assert "deduplicate_keys" in actions
    assert "merge_entities" in actions

def test_business_rule_discovery():
    df = pd.DataFrame({
        "price": [10, 20, -5, 30],
        "quantity": [2, 5, 0, -1],
        "order_date": ["2026-01-05", "2026-01-10", "2026-01-08", "2026-01-02"],
        "ship_date": ["2026-01-06", "2026-01-08", "2026-01-09", "2026-01-05"],
        "discount": [2, 5, 10, 0]
    })
    
    # Mock ColumnMetadata
    from backend.services.intelligence.contracts import ColumnMetadata, Confidence, Evidence
    evidence = Evidence(source="Heuristic", description="", confidence=0.9, supporting_statistics={"canonical_concept": "revenue"})
    meta_price = ColumnMetadata(
        original_name="price", detected_name="Price", detected_meaning="Price",
        column_type="numeric", business_role="measure",
        confidence=Confidence(score=0.9, level="HIGH", reasoning="", supporting_evidence=[evidence])
    )
    evidence_qty = Evidence(source="Heuristic", description="", confidence=0.9, supporting_statistics={"canonical_concept": "quantity"})
    meta_qty = ColumnMetadata(
        original_name="quantity", detected_name="Quantity", detected_meaning="Quantity",
        column_type="numeric", business_role="measure",
        confidence=Confidence(score=0.9, level="HIGH", reasoning="", supporting_evidence=[evidence_qty])
    )

    rules, issues = BusinessRuleDiscovery.discover_and_validate(df, {"price": meta_price, "quantity": meta_qty})
    
    assert len(rules) >= 2
    assert any(i.id == "rule_violation_non_negative_price" for i in issues)
    assert any(i.id == "rule_violation_positive_quantity" for i in issues)
    assert any(i.id == "rule_violation_chronology_order_ship" for i in issues)

def test_schema_validation():
    df = pd.DataFrame({
        "id": [1, 2, 2, 4],
        "parent_id": [None, 1, 1, 5],
        "category": ["Electronics", "Electronics", "Mobiles", "Clothing"],
        "subcategory": ["Phones", "Phones", "Phones", "Shirts"]
    })
    
    hierarchies = [{
        "parent": "category",
        "child": "subcategory",
        "reasoning": "Hierarchy"
    }]
    
    functional_deps = [{
        "determinant": "subcategory",
        "dependent": "category",
        "confidence": 1.0,
        "reasoning": "FD"
    }]
    
    # 1. Duplicate PKs
    issues = SchemaValidationEngine.validate_schema(df, ["id"], hierarchies, functional_deps)
    assert any(i.id == "schema_pk_duplicate_combination" for i in issues)
    
    # 2. Hierarchy Corruption (Phones belongs to Electronics and Mobiles)
    assert any(i.id == "schema_hierarchy_corruption_subcategory_category" for i in issues)

def test_rollback_manager():
    mgr = RollbackManager()
    mgr.clear()
    
    df = pd.DataFrame({"col_a": [1, 2, 3]})
    # Backup
    mgr.register_backup("test_rb_1", "col_a", df["col_a"])
    
    # Mutate
    df["col_a"] = [10, 20, 30]
    assert df["col_a"].iloc[0] == 10
    
    # Restore
    df, restored_col = mgr.restore_backup(df, "test_rb_1")
    assert restored_col == "col_a"
    assert df["col_a"].iloc[0] == 1
    
    # Verify backup is popped
    df, col_fail = mgr.restore_backup(df, "test_rb_1")
    assert col_fail is None

def test_audit_trail():
    trail = AuditTrail()
    trail.clear()
    
    trail.record_entry("test_action", "testing logs", 0.9, "modified 1 row")
    entries = trail.get_trail()
    assert len(entries) == 1
    assert entries[0].action == "test_action"
    assert entries[0].confidence == 0.9

def test_ai_data_engineer_pipeline(dirty_dataframe):
    # Execute full Data Engineer pipeline
    certified = AIDataEngineer.certify_and_clean(dirty_dataframe, dataset_id="test_de_1")
    
    assert isinstance(certified, CertifiedDatasetEnvelope)
    assert certified.metadata.dataset_id == "test_de_1"
    
    # Check that deterministic transformations were applied
    df_clean = certified.dataframe
    assert df_clean["cust_name"].iloc[0] == "John Doe"  # whitespace trimmed
    assert df_clean["revenue_val"].iloc[0] == 120.0     # currency parsed to float
    assert df_clean["is_active"].iloc[0] == True        # boolean standardized
    assert df_clean["weight_col"].iloc[1] == 0.5        # unit standardized (500g -> 0.5kg)
    
    # Check that quality scores and certifications are generated
    assert certified.metadata.quality_report.quality_score.score > 0
    assert certified.metadata.certification.status in ["certified", "warning", "rejected"]
    
    # Verify wrapper methods
    val_rep = certified.to_validation_report()
    assert "status" in val_rep
    assert "issues" in val_rep
    
    clean_log = certified.to_cleaning_log()
    assert len(clean_log) > 0
    assert "action" in clean_log[0]
