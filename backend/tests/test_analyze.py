import io
from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

def test_analyze_success() -> None:
    """
    Test successful parse, validate, and analyze execution.
    """
    file_content = b"region,sales\nNorth,500.0\nEast,300.0\nWest,200.0"
    file = io.BytesIO(file_content)
    response = client.post(
        "/analyze",
        files={"file": ("test_data.csv", file, "text/csv")}
    )
    assert response.status_code == 200
    data = response.json()
    
    # Verify contract properties
    assert "dataset" in data
    assert "quality" in data
    assert "profile" in data
    assert "kpis" in data
    assert "correlations" in data
    assert "anomalies" in data
    assert "forecast" in data
    assert "recommendations" in data
    assert "insights" in data
    assert "narrative" in data
    
    assert data["dataset"]["rowCount"] == 3
    assert data["dataset"]["columnCount"] == 2
    assert data["dataset"]["columns"] == ["region", "sales"]
    assert len(data["dataset"]["preview"]) == 3

def test_analyze_invalid_file() -> None:
    """
    Test analyze error output for empty files.
    """
    file = io.BytesIO(b"")
    response = client.post(
        "/analyze",
        files={"file": ("test_empty.csv", file, "text/csv")}
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()
