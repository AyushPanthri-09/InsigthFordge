import os
from fastapi import UploadFile, HTTPException, status
from backend.core.config import settings
from backend.core.logger import logger

class FileService:
    """
    Handles file upload validations and stages files on disk for downstream processing.
    """
    
    @staticmethod
    def validate_file_metadata(file: UploadFile) -> None:
        """
        Validates the extension of the uploaded file.
        """
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename is missing."
            )
            
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".csv", ".xlsx"]:
            logger.warning(f"File upload rejected: Unsupported extension '{ext}'")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported extension. Only CSV and XLSX files are allowed."
            )

    @staticmethod
    async def stage_upload_file(file: UploadFile, dataset_id: str) -> str:
        """
        Stages the file upload inside the workspace backend/tmp folder.
        Checks size limits iteratively.
        """
        # Create a tmp directory relative to workspace root
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        tmp_dir = os.path.join(base_dir, "tmp")
        os.makedirs(tmp_dir, exist_ok=True)
        
        ext = os.path.splitext(file.filename or "")[1].lower()
        target_path = os.path.join(tmp_dir, f"{dataset_id}{ext}")
        
        size = 0
        try:
            with open(target_path, "wb") as buffer:
                while chunk := await file.read(1024 * 1024):  # 1MB chunks
                    size += len(chunk)
                    if size > settings.max_upload_size:
                        buffer.close()
                        if os.path.exists(target_path):
                            os.unlink(target_path)
                        logger.warning(f"File size limit exceeded: {size} bytes")
                        raise HTTPException(
                            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                            detail=f"File exceeds maximum allowed upload size ({settings.max_upload_size // (1024 * 1024)}MB)."
                        )
                    buffer.write(chunk)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error staging file upload: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Staging file upload failed."
            )
        finally:
            await file.seek(0)
            
        return target_path
