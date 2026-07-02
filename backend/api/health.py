from fastapi import APIRouter
from backend.models.response_models import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse, tags=["Diagnostics"])
def get_health() -> HealthResponse:
    """
    Check backend services health and version metadata.
    """
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        service="InsightForge Backend"
    )
