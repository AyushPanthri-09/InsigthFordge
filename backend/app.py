from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from backend.core.config import settings
from backend.core.logger import logger
from backend.api import health, upload, analyze, auth
from backend.utils.exceptions import InsightForgeException

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown lifecycle events.
    """
    logger.info(
        f"Booting InsightForge Backend. Host: {settings.host}, Port: {settings.port}, "
        f"Debug Mode: {settings.debug}"
    )
    yield
    logger.info("Shutting down InsightForge Backend server.")

app = FastAPI(
    title="InsightForge Backend API",
    description="Enterprise-grade data analysis, validation, and orchestration backend.",
    version="1.0.0",
    debug=settings.debug,
    lifespan=lifespan
)

# Setup CORS middleware parameters
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Router modules
app.include_router(health.router)
app.include_router(upload.router)
app.include_router(analyze.router)
app.include_router(auth.router)

@app.exception_handler(InsightForgeException)
async def custom_exception_handler(request: Request, exc: InsightForgeException):
    """
    Maps custom application errors to standardized HTTP 400 client responses.
    """
    logger.warning(f"Application exception caught on route '{request.url.path}': {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message}
    )

@app.get("/", tags=["Diagnostics"])
def root_redirect():
    """
    Simple API landing description.
    """
    return {
        "message": "InsightForge Backend REST API is running. Go to /docs for Swagger UI documentation."
    }
