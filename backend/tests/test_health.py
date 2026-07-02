from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

def test_health_check() -> None:
    """
    Test health check endpoint behavior and payload.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"
    assert "service" in data
