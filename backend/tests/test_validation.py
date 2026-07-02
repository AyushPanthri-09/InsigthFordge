import pytest
import pandas as pd
from backend.services.validator import DatasetValidator
from backend.utils.exceptions import ValidationException

def test_validation_success() -> None:
    """
    Test validation succeeds for structurally correct dataframes.
    """
    df = pd.DataFrame({
        "order_id": ["O1", "O2"],
        "sales": [100.0, 150.0]
    })
    # Should complete without throwing exception
    DatasetValidator.validate_dataframe(df)

def test_validation_empty_dataframe() -> None:
    """
    Test validation raises exception for empty structured frames.
    """
    df = pd.DataFrame()
    with pytest.raises(ValidationException) as exc:
        DatasetValidator.validate_dataframe(df)
    assert "empty" in str(exc.value).lower()

def test_validation_duplicate_headers() -> None:
    """
    Test validation raises exception for duplicate header elements.
    """
    df = pd.DataFrame([[1, 2]], columns=["duplicate_col", "duplicate_col"])
    with pytest.raises(ValidationException) as exc:
        DatasetValidator.validate_dataframe(df)
    assert "duplicate" in str(exc.value).lower()

def test_validation_complex_data_types() -> None:
    """
    Test validation flags and throws for unsupported complex data types.
    """
    df = pd.DataFrame({
        "complex_col": [2 + 3j, 4 - 1j]
    })
    with pytest.raises(ValidationException) as exc:
        DatasetValidator.validate_dataframe(df)
    assert "complex" in str(exc.value).lower()
