import pandas as pd
from backend.utils.exceptions import ValidationException
from backend.services.analytics.validator import DatasetValidationEngine
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
        report = DatasetValidationEngine.run_validation(df)
        if report["status"] == "invalid":
            # Extract first critical issue description
            crit_issues = [i for i in report["issues"] if i["severity"] == "critical"]
            msg = crit_issues[0]["description"] if crit_issues else "Dataset structure is invalid."
            logger.warning(f"Validation failed: {msg}")
            raise ValidationException(msg)

