import io
from fastapi.testclient import TestClient
from backend.app import app
from backend.core.config import settings

client = TestClient(app)

def test_upload_success_csv() -> None:
    """
    Test successful file upload under the staged sizing limits.
    """
    file_content = b"order_id,revenue\nO100,250.0\nO101,150.0"
    file = io.BytesIO(file_content)
    response = client.post(
        "/upload",
        files={"file": ("test.csv", file, "text/csv")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "datasetId" in data
    assert data["fileName"] == "test.csv"
    assert data["fileSize"] == len(file_content)

def test_upload_unsupported_extension() -> None:
    """
    Test rejection of unsupported file extensions.
    """
    file = io.BytesIO(b"some dummy contents")
    response = client.post(
        "/upload",
        files={"file": ("test.txt", file, "text/plain")}
    )
    assert response.status_code == 400
    assert "Unsupported extension" in response.json()["detail"]

def test_upload_oversized() -> None:
    """
    Test rejection of oversized file uploads.
    """
    original_size = settings.max_upload_size
    settings.max_upload_size = 5  # limit to 5 bytes
    try:
        file = io.BytesIO(b"staged file is larger than five bytes limit")
        response = client.post(
            "/upload",
            files={"file": ("test.csv", file, "text/csv")}
        )
        assert response.status_code == 413
        assert "exceeds maximum allowed upload size" in response.json()["detail"]
    finally:
        settings.max_upload_size = original_size
