import math
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from backend.services.intelligence import (
    UniversalSemanticEngine,
    SharedProjectMemory,
    ReasoningGraph,
    OntologyManager,
    ConfidenceEngine,
    EvidenceFactory,
    SchemaUnderstandingEngine,
    EntityDetector,
    MetricDiscoverer,
    DimensionDiscoverer,
    GrainDetector,
)
from backend.services.intelligence.contracts import Evidence, Confidence, ColumnMetadata

@pytest.fixture
def retail_dataframe():
    """Generates a synthetic retail dataframe for semantic testing."""
    rows = 100
    dates = [datetime(2026, 1, 1) + timedelta(days=i%10) for i in range(rows)]
    
    df = pd.DataFrame({
        "order_id": [1000 + i for i in range(rows)],
        "cust_id": [2000 + (i % 10) for i in range(rows)],
        "prod_sku": [3000 + (i % 5) for i in range(rows)],
        "order_date": dates,
        "qty": np.random.randint(1, 10, rows),
        "amt": np.random.uniform(10.0, 500.0, rows),
        "status_code": ["completed" if i % 2 == 0 else "pending" for i in range(rows)],
        "region_name": ["North" if i % 4 == 0 else "South" for i in range(rows)]
    })
    return df

@pytest.fixture
def healthcare_dataframe():
    """Generates a healthcare dataframe for domain testing."""
    rows = 20
    df = pd.DataFrame({
        "patient_id": [i for i in range(rows)],
        "blood_pressure": [120 for i in range(rows)],
        "heart_rate": [72 for i in range(rows)],
        "diagnosis_desc": ["healthy" for _ in range(rows)]
    })
    return df

def test_ontology_manager():
    # Abbreviation expansion
    assert OntologyManager.normalize_name("qty") == "Quantity"
    assert OntologyManager.normalize_name("cust_id") == "Customer Identifier"
    assert OntologyManager.normalize_name("DOB") == "Date of Birth"
    assert OntologyManager.normalize_name("order_qty") == "Order Quantity"
    
    # CamelCase parsing
    assert OntologyManager.normalize_name("orderId") == "Order Identifier"
    assert OntologyManager.normalize_name("OrderID") == "Order Identifier"
    
    # Empty string
    assert OntologyManager.normalize_name("") == ""
    
    # Resolve concept
    assert OntologyManager.resolve_concept("revenue") == "revenue"
    assert OntologyManager.resolve_concept("gross_sales") == "revenue"
    assert OntologyManager.resolve_concept("cust_id") == "customer"
    assert OntologyManager.resolve_concept("random_col") == "generic"
    assert OntologyManager.resolve_concept("") == "generic"
    
    # Descriptions
    assert "monetary income" in OntologyManager.get_description_for_column("rev", "revenue")
    assert "Represents" in OntologyManager.get_description_for_column("unknown", "generic")

def test_evidence_factory():
    ev = EvidenceFactory.create_evidence(
        source="TestHeuristic",
        description="Testing evidence creation",
        confidence=0.85,
        supporting_columns=["col_a"],
        supporting_statistics={"mean": 10.0}
    )
    assert isinstance(ev, Evidence)
    assert ev.source == "TestHeuristic"
    assert math.isclose(ev.confidence, 0.85, rel_tol=1e-9, abs_tol=1e-12)
    assert "col_a" in ev.supporting_columns
    assert math.isclose(ev.supporting_statistics["mean"], 10.0, rel_tol=1e-9, abs_tol=1e-12)
    assert ev.validation_status == "valid"
    assert ev.timestamp.endswith("Z")

def test_confidence_engine():
    # High confidence classification
    c_high = ConfidenceEngine.compute_confidence(0.95, "Looks extremely solid")
    assert c_high.level == "HIGH"
    assert math.isclose(c_high.score, 0.95, rel_tol=1e-9, abs_tol=1e-12)
    
    # Medium confidence
    c_med = ConfidenceEngine.compute_confidence(0.65, "Looks decent")
    assert c_med.level == "MEDIUM"
    
    # Low confidence
    c_low = ConfidenceEngine.compute_confidence(0.25, "Barely matched")
    assert c_low.level == "LOW"
    
    # Boundaries
    c_edge1 = ConfidenceEngine.compute_confidence(1.5, "Out of bounds")
    assert math.isclose(c_edge1.score, 1.0, rel_tol=1e-9, abs_tol=1e-12)
    c_edge2 = ConfidenceEngine.compute_confidence(-0.5, "Negative score")
    assert math.isclose(c_edge2.score, 0.0, rel_tol=1e-9, abs_tol=1e-12)

def test_schema_understanding_retail(retail_dataframe):
    schema = SchemaUnderstandingEngine.analyze_schema(retail_dataframe)
    
    assert schema["row_count"] == 100
    assert schema["col_count"] == 8
    
    # Primary Key should be order_id
    assert "order_id" in schema["primary_keys"]
    
    # Check Candidate Keys includes order_id
    assert ["order_id"] in schema["candidate_keys"]
    
    # Check Foreign Keys detected
    fks = [fk["column"] for fk in schema["foreign_keys"]]
    assert "cust_id" in fks
    
    # Check Functional Dependencies
    # Since order_id is unique, it is detected as a candidate_key/primary_key
    assert "order_id" in schema["primary_keys"]

def test_schema_understanding_empty():
    empty_df = pd.DataFrame()
    schema = SchemaUnderstandingEngine.analyze_schema(empty_df)
    assert schema["row_count"] == 0
    assert len(schema["primary_keys"]) == 0

def test_schema_understanding_composite():
    # Construct df with no single unique key, but composite key (A, B)
    df = pd.DataFrame({
        "A": [1, 1, 2, 2],
        "B": [1, 2, 1, 2],
        "C": ["v1", "v1", "v2", "v2"]
    })
    schema = SchemaUnderstandingEngine.analyze_schema(df)
    assert len(schema["primary_keys"]) == 0
    assert ["A", "B"] in schema["candidate_keys"]

def test_entity_detector(retail_dataframe):
    # Setup some basic column metadata manually
    cols_meta = {
        "cust_id": ColumnMetadata(
            original_name="cust_id",
            detected_name="Customer Identifier",
            detected_meaning="Identifier",
            column_type="identifier",
            business_role="key",
            confidence=Confidence(score=0.9, level="HIGH", reasoning="PK", supporting_evidence=[])
        ),
        "prod_sku": ColumnMetadata(
            original_name="prod_sku",
            detected_name="Product SKU",
            detected_meaning="SKU",
            column_type="categorical",
            business_role="dimension",
            confidence=Confidence(score=0.7, level="MEDIUM", reasoning="SKU", supporting_evidence=[])
        )
    }
    entities = EntityDetector.detect_entities(retail_dataframe, cols_meta)
    entity_names = [e.name for e in entities]
    
    assert "Customer" in entity_names
    assert "Product" in entity_names
    
    customer_ent = next(e for e in entities if e.name == "Customer")
    assert "cust_id" in customer_ent.columns
    assert customer_ent.confidence.level in ["HIGH", "MEDIUM"]

def test_metric_and_dimension_discovery(retail_dataframe):
    cols_meta = UniversalSemanticEngine._classify_columns(retail_dataframe)
    
    # Discover Metrics
    metrics = MetricDiscoverer.discover_metrics(retail_dataframe, cols_meta)
    metric_cols = [m.column for m in metrics]
    
    assert "amt" in metric_cols
    assert "qty" in metric_cols
    
    amt_metric = next(m for m in metrics if m.column == "amt")
    assert amt_metric.formula == "SUM"
    assert amt_metric.confidence.score > 0.7
    
    # Discover Dimensions
    dimensions = DimensionDiscoverer.discover_dimensions(retail_dataframe, cols_meta)
    dim_cols = [d.column for d in dimensions]
    
    assert "region_name" in dim_cols
    assert "order_date" in dim_cols
    assert "order_id" not in dim_cols  # Keys should be skipped from standard dimensions

def test_grain_detector(retail_dataframe):
    cols_meta = UniversalSemanticEngine._classify_columns(retail_dataframe)
    entities = EntityDetector.detect_entities(retail_dataframe, cols_meta)
    
    # Single PK
    grain, conf = GrainDetector.detect_grain(
        df=retail_dataframe,
        primary_keys=["order_id"],
        candidate_keys=[["order_id"]],
        entities=entities,
        columns_metadata=cols_meta
    )
    assert "order" in grain.lower()
    assert conf.level == "HIGH"
    
    # Composite PK
    grain_comp, conf_comp = GrainDetector.detect_grain(
        df=retail_dataframe,
        primary_keys=["order_id", "prod_sku"],
        candidate_keys=[["order_id", "prod_sku"]],
        entities=entities,
        columns_metadata=cols_meta
    )
    assert "order" in grain_comp.lower() or "combination" in grain_comp.lower()
    
    # No Keys (log file fallback)
    log_df = pd.DataFrame({
        "log_timestamp": [datetime.now()],
        "message": ["Server started"]
    })
    cols_meta_log = UniversalSemanticEngine._classify_columns(log_df)
    grain_log, conf_log = GrainDetector.detect_grain(
        df=log_df,
        primary_keys=[],
        candidate_keys=[],
        entities=[],
        columns_metadata=cols_meta_log
    )
    assert "log" in grain_log.lower() or "record" in grain_log.lower() or "observation" in grain_log.lower()

def test_reasoning_graph():
    rg = ReasoningGraph()
    
    # Add nodes
    rg.add_node("n1", "Revenue Declined", "Conclusion", "Overall business revenue has dropped.")
    rg.add_node("n2", "Sales Volume Dropped", "Claim", "Count of products sold is lower.")
    rg.add_node("n3", "Low Retention", "Claim", "Customer retention is below threshold.")
    
    # Add invalid/out of bounds edge (should fail gracefully)
    assert rg.add_edge("n1", "nonexistent") is None
    
    # Add valid edges
    rg.add_edge("n2", "n1", "supports")
    rg.add_edge("n3", "n2", "supports")
    
    # Retrieve node
    assert rg.get_node("n1").label == "Revenue Declined"
    assert rg.get_node("nonexistent") is None
    
    # Trace dependencies
    deps = [d.id for d in rg.trace_dependencies("n1")]
    assert "n2" in deps
    assert "n3" in deps
    
    # Trace implications
    imps = [i.id for i in rg.trace_implications("n3")]
    assert "n2" in imps
    assert "n1" in imps
    
    # Export
    exported = rg.to_dict()
    assert len(exported["nodes"]) == 3
    assert len(exported["edges"]) == 2

def test_shared_memory(retail_dataframe):
    memory = SharedProjectMemory()
    memory.clear()
    
    # Store some custom metadata
    memory.set_metadata("dataset_123", "row_count", 100)
    assert memory.get_metadata("dataset_123", "row_count") == 100
    assert memory.get_metadata("dataset_123", "nonexistent") is None
    
    # Clear memory
    memory.clear("dataset_123")
    assert memory.get_metadata("dataset_123", "row_count") is None

def test_universal_semantic_engine(retail_dataframe, healthcare_dataframe):
    # 1. Retail Analysis
    result = UniversalSemanticEngine.analyze(retail_dataframe, "retail_1")
    
    assert result.memory_ref_id == "retail_1"
    assert result.dataset_metadata.row_count == 100
    assert "order_id" in result.columns
    assert len(result.domains) > 0
    assert result.domains[0].domain == "Retail"
    
    # Check that it's cached in SharedProjectMemory
    cached = SharedProjectMemory().get_semantic_result("retail_1")
    assert cached is not None
    assert cached.dataset_metadata.col_count == 8
    
    # 2. Healthcare Analysis
    result_hc = UniversalSemanticEngine.analyze(healthcare_dataframe)
    assert result_hc.domains[0].domain == "Healthcare"
