import time
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from backend.services.file_service import FileService
from backend.models.response_models import UploadResponse
from backend.utils.helpers import generate_id
from backend.core.logger import logger

router = APIRouter()

@router.post("/upload", response_model=UploadResponse, tags=["File Intake"])
async def upload_file(file: UploadFile = File(...)) -> UploadResponse:
    """
    Intake and stage an uploaded dataset file (CSV/XLSX).
    Enforces maximum size rules and extension controls.
    """
    start_time = time.time()
    
    # 1. Validate file extension metadata
    FileService.validate_file_metadata(file)
    
    # 2. Stage file to disk and validate file size constraints
    dataset_id = generate_id()
    try:
        staged_path = await FileService.stage_upload_file(file, dataset_id)
        file_size = os.path.getsize(staged_path)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Intake pipeline error on '{file.filename}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Intake pipeline staging failure: {str(e)}"
        )
        
    duration = time.time() - start_time
    logger.info(
        f"File '{file.filename}' processed successfully. Staged at '{staged_path}' "
        f"in {duration:.3f}s. Assigned dataset ID: {dataset_id}"
    )
    
    return UploadResponse(
        datasetId=dataset_id,
        fileName=file.filename or "unknown",
        fileSize=file_size,
        contentType=file.content_type or "application/octet-stream",
        message="Dataset file uploaded and staged successfully."
    )
