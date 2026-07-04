import pandas as pd

from backend.services.analytics.semantic_column_classifier import classify_dataframe_columns


def test_identifier_detection_uuid_like():
    df = pd.DataFrame({
        "user_id": ["a1f8", "b2c9", "d3e0", "f4a1"],
        "age": [20, 21, 19, 22],
    })
    res = classify_dataframe_columns(df)
    assert res["user_id"]["type"] == "IDENTIFIER"
    assert res["age"]["type"] in {"NUMERIC_DISCRETE", "NUMERIC_CONTINUOUS"}


def test_boolean_detection_pass_fail():
    df = pd.DataFrame({
        "passed": ["PASS", "FAIL", "PASS", "PASS"],
        "score": [80, 40, 75, 90],
    })
    res = classify_dataframe_columns(df)
    assert res["passed"]["type"] == "BOOLEAN"


def test_datetime_detection_various_formats():
    df = pd.DataFrame({
        "created_at": ["2024-01-01", "2024/01/02", "01-03-2024", "2024-01-04"],
        "value": [1.2, 3.4, 2.2, 5.5],
    })
    res = classify_dataframe_columns(df)
    assert res["created_at"]["type"] == "DATETIME"


def test_percentage_detection():
    df = pd.DataFrame({
        "attendance_pct": ["90%", "85%", "100%", "75%"],
        "course": ["A", "B", "A", "C"],
    })
    res = classify_dataframe_columns(df)
    assert res["attendance_pct"]["type"] == "PERCENTAGE"


def test_monetary_detection_amount():
    df = pd.DataFrame({
        "fees_paid": ["$1000", "$850", "$920", "$1100"],
        "city": ["Delhi", "Delhi", "Mumbai", "Pune"],
    })
    res = classify_dataframe_columns(df)
    assert res["fees_paid"]["type"] == "MONETARY"


def test_geographic_detection_lat_long():
    df = pd.DataFrame({
        "lat": [28.6, 19.1, 12.9, 17.4],
        "lon": [77.2, 72.8, 77.6, 78.4],
        "region": ["N", "S", "E", "W"],
    })
    res = classify_dataframe_columns(df)
    assert res["lat"]["type"] == "GEOGRAPHIC"
    assert res["lon"]["type"] == "GEOGRAPHIC"


def test_text_vs_categorical_detection():
    df = pd.DataFrame({
        "category": ["A", "B", "A", "C"],
        "review": [
            "Excellent service and friendly staff",
            "Bad experience but will try again",
            "Great value for money",
            "Not satisfied with the quality",
        ],
    })
    res = classify_dataframe_columns(df)
    assert res["category"]["type"] == "CATEGORICAL"
    assert res["review"]["type"] == "TEXT"

