import os
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from backend.services.file_service import FileService
from backend.services.parser import DatasetParser
from backend.services.validator import DatasetValidator
from backend.models.response_models import AnalyzeResponse
from backend.services.analytics.report_engine import ExecutiveReportEngine
from backend.utils.helpers import generate_id
from backend.utils.exceptions import ParserException, ValidationException
from backend.core.logger import logger

router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse, tags=["Analytics Engine"])
async def analyze_dataset(file: UploadFile = File(...)) -> AnalyzeResponse:
    """
    Intake, validate, parse, and analyze a dataset file.
    Validates structural matrices using validator and parser services.
    Returns standard profiled, cleaned, and statistically analyzed reports.
    """
    start_time = time.time()
    
    # 1. Validate extension metadata
    FileService.validate_file_metadata(file)
    
    # 2. Stage file locally
    dataset_id = generate_id()
    staged_path = await FileService.stage_upload_file(file, dataset_id)
    
    try:
        # 3. Parse staged file into pandas DataFrame
        df = DatasetParser.parse_file(staged_path)
        
        # 4. Run structural validations
        DatasetValidator.validate_dataframe(df)
        
        # 5. Run the new modular analytics pipeline
        report_data = ExecutiveReportEngine.run_full_pipeline(
            df=df,
            file_name=file.filename or "unknown",
            dataset_id=dataset_id
        )
        
    except (ParserException, ValidationException) as e:
        logger.warning(f"File analysis validation failed: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        ) from e
    except Exception as e:
        logger.error(f"Internal analysis pipeline failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analytics pipeline failed: {str(e)}"
        ) from e
    finally:
        # Staging file cleanup to avoid local storage leaks
        if os.path.exists(staged_path):
            os.unlink(staged_path)
            
    duration = time.time() - start_time
    logger.info(
        f"Analyzed dataset '{file.filename}' (ID: {dataset_id}) in {duration:.3f}s"
    )
    
    return AnalyzeResponse(**report_data)

