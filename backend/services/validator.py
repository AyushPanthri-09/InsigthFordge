import pandas as pd
from backend.utils.exceptions import ValidationException
from backend.core.logger import logger

class DatasetValidator:
    """
    Validates structural matrices parsed from file streams.
    Checks constraints such as column count, duplicate headers, and empty datasets.
    """
    
    @staticmethod
    def validate_dataframe(df: pd.DataFrame) -> None:
        """
        Runs comprehensive checks on the DataFrame structure.
        """
        # Check if DataFrame is empty (both columns and rows)
        if df.empty or len(df.columns) == 0:
            logger.warning("Validation failed: Empty DataFrame structure.")
            raise ValidationException("Dataset is empty (contains no rows or columns).")
            
        # Check duplicate column names (headers)
        columns = list(df.columns)
        str_columns = [str(c).strip() for c in columns]
        if len(str_columns) != len(set(str_columns)):
            duplicates = {col for col in str_columns if str_columns.count(col) > 1}
            logger.warning(f"Validation failed: Duplicate headers found: {duplicates}")
            raise ValidationException(f"Dataset contains duplicate header columns: {list(duplicates)}")
            
        # Check for complex number data types (unsupported analytics format)
        for col in df.columns:
            dtype_str = str(df[col].dtype)
            if "complex" in dtype_str:
                logger.warning(f"Validation failed: Complex datatype detected in column '{col}'")
                raise ValidationException(f"Column '{col}' has unsupported complex data type.")
                
        # Validate that we have at least one key column or a metric column
        if len(df.columns) < 1:
            raise ValidationException("Dataset must have at least one column.")
