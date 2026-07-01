import os
import pytest
import pandas as pd
from backend.services.parser import DatasetParser
from backend.utils.exceptions import ParserException

def test_parser_valid_csv(tmp_path) -> None:
    """
    Test parser extracts data frame elements from valid CSV encoding.
    """
    csv_file = tmp_path / "valid.csv"
    csv_file.write_text("id,val\n1,10.0\n2,20.0", encoding="utf-8")
    
    df = DatasetParser.parse_file(str(csv_file))
    assert isinstance(df, pd.DataFrame)
    assert df.shape == (2, 2)
    assert list(df.columns) == ["id", "val"]

def test_parser_empty_csv(tmp_path) -> None:
    """
    Test parser throws correct exception for empty staged CSV files.
    """
    empty_file = tmp_path / "empty.csv"
    # Create zero byte file
    open(str(empty_file), "w").close()
    
    with pytest.raises(ParserException) as exc:
        DatasetParser.parse_file(str(empty_file))
    assert "empty" in str(exc.value).lower()

def test_parser_nonexistent_file() -> None:
    """
    Test parser raises file not found exception for invalid paths.
    """
    with pytest.raises(ParserException) as exc:
        DatasetParser.parse_file("nonexistent_dataset_staging.csv")
    assert "exist" in str(exc.value).lower()
