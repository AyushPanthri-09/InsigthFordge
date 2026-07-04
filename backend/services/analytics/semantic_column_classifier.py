import math
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


SEMANTIC_TYPES = [
    "IDENTIFIER",
    "CATEGORICAL",
    "NUMERIC_CONTINUOUS",
    "NUMERIC_DISCRETE",
    "DATETIME",
    "GEOGRAPHIC",
    "TEXT",
    "MONETARY",
    "PERCENTAGE",
    "BOOLEAN",
]


_ID_PATTERNS = [
    r"(^|_)id($|_)",
    r"(^|_)(student|user|account|order|transaction|customer|patient)(_id)?($|_)",
    r"uuid",
    r"(^|_)(uuid)($|_)",
    r"(^|_)(code|key)($|_)",
]

_DATETIME_PATTERNS = [
    r"(^|_)date($|_)",
    r"(^|_)(timestamp|created|creation|updated|updated_at|modified|modified_at)($|_)",
    r"(^|_)(time|datetime)($|_)",
]

_BOOLEAN_PATTERNS = [
    r"(^|_)(is|has|active|approved|valid|enabled|passed|pass|fail|failure|consent)($|_)",
    r"(^|_)(y|n)($|_)",
]

_PERCENT_PATTERNS = [
    r"(^|_)(pct|percent|percentage|rate|attendance|completion|conversion|growth)($|_)",
]

_MONETARY_PATTERNS = [
    r"(^|_)(fee|fees|price|amount|revenue|cost|salary|balance|total_revenue|usd|eur|gbp|money|payment)($|_)",
    r"\$|€|£",
]

_GEOGRAPHIC_PATTERNS = [
    r"(^|_)(city|state|country|region|province|zip|postal|postcode)($|_)",
    r"(^|_)(lat|latitude)($|_)",
    r"(^|_)(lon|lng|longitude)($|_)",
]


def _norm(s: str) -> str:
    return s.strip().lower()


def _any_regex_match(text: str, patterns: List[str]) -> bool:
    for p in patterns:
        if re.search(p, text, flags=re.IGNORECASE):
            return True
    return False


def _safe_non_null_series(series: pd.Series, max_samples: int = 5000) -> pd.Series:
    s = series.dropna()
    if len(s) > max_samples:
        s = s.sample(max_samples, random_state=42)
    return s


def _parse_datetime_success_rate(series: pd.Series) -> float:
    s = series.dropna()
    if s.empty:
        return 0.0
    # Only attempt for object/string columns
    if not (s.dtype == object or pd.api.types.is_string_dtype(s.dtype)):
        return 1.0 if pd.api.types.is_datetime64_any_dtype(series) else 0.0
    parsed = pd.to_datetime(s, errors="coerce", utc=True)
    ok = parsed.notna().sum()
    return ok / max(1, len(s))


def _coerce_numeric_success_rate(series: pd.Series) -> Tuple[float, Optional[pd.Series]]:
    s = series.dropna()
    if s.empty:
        return 0.0, None
    if pd.api.types.is_numeric_dtype(s.dtype):
        return 1.0, pd.to_numeric(series, errors="coerce")
    coerced = pd.to_numeric(s.astype(str).str.replace(",", "", regex=False), errors="coerce")
    ok = coerced.notna().sum()
    return ok / max(1, len(s)), coerced


def _unique_ratio(series: pd.Series) -> float:
    s = series.dropna()
    if len(s) == 0:
        return 0.0
    return float(s.nunique(dropna=True) / len(s))


def _string_avg_len(series: pd.Series) -> float:
    s = series.dropna()
    if s.empty:
        return 0.0
    s = s.astype(str).str.strip()
    s = s[s != ""]
    if len(s) == 0:
        return 0.0
    return float(s.str.len().mean())


def _boolean_value_match_rate(series: pd.Series) -> float:
    s = _safe_non_null_series(series)
    if s.empty:
        return 0.0

    # Accept booleans and common tokens
    if s.dtype == bool:
        return 1.0

    tokens = s.astype(str).str.strip().str.lower()
    allowed = {
        "true",
        "false",
        "t",
        "f",
        "yes",
        "no",
        "y",
        "n",
        "1",
        "0",
        "pass",
        "fail",
        "approved",
        "rejected",
        "active",
        "inactive",
    }

    hits = tokens.isin(allowed).sum()
    return float(hits / len(tokens))


def _percent_value_evidence(series: pd.Series) -> float:
    s = _safe_non_null_series(series)
    if s.empty:
        return 0.0
    # numeric coercion
    rate, coerced = _coerce_numeric_success_rate(series)
    if coerced is not None and rate > 0:
        v = coerced.dropna()
        if v.empty:
            return 0.0
        # percent-like range or direct percent token
        within_0_100 = ((v >= 0) & (v <= 100)).mean()
        return float(0.5 * rate + 0.5 * within_0_100)

    # token-based
    tokens = s.astype(str).str.contains(r"%|percent", case=False, regex=True).mean()
    return float(tokens)


def _monetary_value_evidence(series: pd.Series) -> float:
    s = _safe_non_null_series(series)
    if s.empty:
        return 0.0

    token_hits = s.astype(str).str.contains(r"\$|€|£|usd|eur|gbp|revenue|fee|amount|cost", case=False, regex=True).mean()
    rate, coerced = _coerce_numeric_success_rate(series)
    if coerced is not None and rate > 0:
        v = coerced.dropna()
        if v.empty:
            return float(token_hits)
        positive_ratio = (v >= 0).mean()
        # money usually has magnitude with decimals sometimes; still heuristic
        magnitude = float(np.percentile(np.abs(v), 75))
        mag_score = 1.0 if magnitude > 10 else 0.4 if magnitude > 1 else 0.2
        return float(0.4 * token_hits + 0.6 * (rate * positive_ratio * mag_score))

    return float(token_hits)


def _geographic_value_evidence(series: pd.Series) -> float:
    """Return evidence only when values look like coordinates.

    Heuristic: raw range checks alone are insufficient (e.g., age often lies within [-90,90]).
    We therefore require a strong match AND a name-based hint will later boost confidence.
    """
    s = _safe_non_null_series(series)
    if s.empty:
        return 0.0

    # Lat/long range check via numeric coercion
    rate, coerced = _coerce_numeric_success_rate(series)
    if coerced is None or rate <= 0:
        return 0.0

    v = coerced.dropna()
    if v.empty:
        return 0.0

    lat_score = ((v >= -90) & (v <= 90)).mean()
    lon_score = ((v >= -180) & (v <= 180)).mean()

    # Strong gating to avoid classifying small-range numerics as geographic.
    # Coordinates typically have decimals (not guaranteed) and cover a wider numeric spread.
    spread = float(v.max() - v.min()) if len(v) > 1 else 0.0
    has_decimals = float((np.mod(v.to_numpy(), 1) != 0).mean()) if len(v) > 0 else 0.0

    # Hard gate: avoid classifying small-range integers (e.g., age) as coordinates.
    # Coordinates typically have decimals OR a larger spread than simple ordinal counts.
    coord_like = (max(lat_score, lon_score) >= 0.98) and (spread >= 5.0 or has_decimals >= 0.3)
    if not coord_like:
        return 0.0

    return float(rate * max(lat_score, lon_score))




def _datetime_evidence(series: pd.Series) -> float:
    # parse success for object/string; 1.0 if already datetime
    if pd.api.types.is_datetime64_any_dtype(series) or isinstance(series.dtype, pd.DatetimeTZDtype):
        return 1.0
    return _parse_datetime_success_rate(series)


def _numeric_continuity_score(coerced_numeric: pd.Series) -> Tuple[float, float]:
    """Returns (integer_ness_rate, discrete_uniqueness_score)."""
    v = coerced_numeric.dropna()
    if v.empty:
        return 0.0, 0.0
    # integer-ness: fraction where value is close to integer
    frac = np.mod(v.to_numpy(), 1)
    integer_like = np.isclose(frac, 0, atol=1e-9)
    integer_ness = float(integer_like.mean())

    unique_ratio = float(v.nunique(dropna=True) / len(v))
    # discrete tends to have lower unique ratio (repeats)
    discrete_score = float(1.0 - min(1.0, unique_ratio * 5.0))
    return integer_ness, discrete_score


@dataclass
class ColumnDecision:
    semantic_type: str
    confidence: float
    reason: str
    evidence: List[Dict[str, Any]]


def _decide_column_type(df: pd.DataFrame, col: str) -> ColumnDecision:
    series = df[col]
    col_norm = _norm(str(col))

    evidence: List[Dict[str, Any]] = []

    # Quick name-based evidence
    name_hits = {
        "id": _any_regex_match(col_norm, _ID_PATTERNS),
        "datetime": _any_regex_match(col_norm, _DATETIME_PATTERNS),
        "boolean": _any_regex_match(col_norm, _BOOLEAN_PATTERNS),
        "percent": _any_regex_match(col_norm, _PERCENT_PATTERNS),
        "monetary": _any_regex_match(col_norm, _MONETARY_PATTERNS),
        "geo": _any_regex_match(col_norm, _GEOGRAPHIC_PATTERNS),
    }


    for k, v in name_hits.items():
        if v:
            evidence.append({"kind": "name_pattern", "detail": f"matched {k} pattern", "score": 0.5})

    # Value-based evidence (bounded sampling)
    non_null = series.dropna()
    if len(non_null) == 0:
        return ColumnDecision(
            semantic_type="CATEGORICAL",
            confidence=0.1,
            reason="Column is entirely null; defaulting to CATEGORICAL.",
            evidence=[{"kind": "missing", "detail": "100% null", "score": 0.0}],
        )

    unique_r = _unique_ratio(series)
    evidence.append({"kind": "uniqueness", "detail": f"unique_ratio={unique_r:.3f}", "score": min(1.0, unique_r)})

    # Datetime evidence
    dt_e = _datetime_evidence(series)
    if dt_e > 0:
        evidence.append({"kind": "datetime_parse", "detail": f"success_rate={dt_e:.3f}", "score": min(1.0, dt_e)})

    # Boolean evidence
    b_e = _boolean_value_match_rate(series)
    if b_e > 0:
        evidence.append({"kind": "boolean_pattern", "detail": f"match_rate={b_e:.3f}", "score": min(1.0, b_e)})

    # Numeric coercion
    num_rate, coerced_num = _coerce_numeric_success_rate(series)
    if num_rate > 0:
        evidence.append({"kind": "numeric_parse", "detail": f"success_rate={num_rate:.3f}", "score": min(1.0, num_rate)})

    # String length evidence
    avg_len = _string_avg_len(series)
    if avg_len > 0:
        evidence.append({"kind": "string_stats", "detail": f"avg_len={avg_len:.1f}", "score": min(1.0, avg_len / 30.0)})

    # Special semantic evidence
    percent_e = _percent_value_evidence(series)
    if percent_e > 0:
        evidence.append({"kind": "percentage_evidence", "detail": f"evidence={percent_e:.3f}", "score": min(1.0, percent_e)})

    monetary_e = _monetary_value_evidence(series)
    if monetary_e > 0:
        evidence.append({"kind": "monetary_evidence", "detail": f"evidence={monetary_e:.3f}", "score": min(1.0, monetary_e)})

    geo_e = _geographic_value_evidence(series)
    if geo_e > 0:
        evidence.append({"kind": "geographic_value_evidence", "detail": f"evidence={geo_e:.3f}", "score": min(1.0, geo_e)})

    # Determine candidate scores
    scores: Dict[str, float] = {t: 0.0 for t in SEMANTIC_TYPES}

    # Boolean
    if name_hits["boolean"]:
        scores["BOOLEAN"] += 0.45
    scores["BOOLEAN"] += 0.65 * b_e

    # Datetime
    if name_hits["datetime"]:
        scores["DATETIME"] += 0.45
    scores["DATETIME"] += 0.7 * dt_e

    # Geographic
    if name_hits["geo"]:
        scores["GEOGRAPHIC"] += 0.35
    scores["GEOGRAPHIC"] += 0.7 * geo_e

    # Identifier
    if name_hits["id"]:
        scores["IDENTIFIER"] += 0.45
    # id tends to be very unique
    if unique_r >= 0.85:
        scores["IDENTIFIER"] += 0.55
    elif unique_r >= 0.6:
        scores["IDENTIFIER"] += 0.25

    # Percentage
    # Percentage evidence should be allowed for object/string numeric tokens like "90%".
    # So we use percent_e directly, but still gate strong misclassification for pure numeric columns.
    if name_hits["percent"]:
        scores["PERCENTAGE"] += 0.55
    # Allow when percent token evidence exists OR when we successfully parsed numeric values.
    if num_rate >= 0.7 or percent_e > 0.05:
        scores["PERCENTAGE"] += 0.7 * percent_e



    # Monetary
    if name_hits["monetary"]:
        scores["MONETARY"] += 0.35
    scores["MONETARY"] += 0.6 * monetary_e

    # Numeric continuous/discrete
    if coerced_num is not None and num_rate >= 0.7:
        if coerced_num is not None:
            integer_ness, discrete_score = _numeric_continuity_score(coerced_num)
            if integer_ness >= 0.85:
                scores["NUMERIC_DISCRETE"] += 0.7 * integer_ness
                scores["NUMERIC_CONTINUOUS"] += 0.15
            else:
                scores["NUMERIC_CONTINUOUS"] += 0.7
                scores["NUMERIC_DISCRETE"] += 0.25 * discrete_score

    # Text vs Categorical
    # object columns with high uniqueness + long strings => TEXT
    # lower uniqueness => CATEGORICAL
    if pd.api.types.is_object_dtype(series.dtype) or pd.api.types.is_string_dtype(series.dtype) or not pd.api.types.is_numeric_dtype(series.dtype):
        text_score = 0.0
        cat_score = 0.0
        # avg_len > 25 tends toward text
        text_score += min(1.0, avg_len / 25.0) * 0.6
        text_score += min(1.0, unique_r * 2.0) * 0.4

        # categorical: moderate unique, shorter strings
        cat_score += (1.0 - min(1.0, unique_r * 2.0)) * 0.5
        cat_score += min(1.0, max(0.0, (20.0 - avg_len) / 20.0)) * 0.5

        # If name suggests id-like but not unique enough, prefer categorical over text
        if name_hits["id"]:
            cat_score += 0.1

        scores["TEXT"] += text_score
        scores["CATEGORICAL"] += cat_score + 0.1

    # Fallbacks
    if math.isclose(max(scores.values()), 0.0, rel_tol=1e-9, abs_tol=1e-12):
        # use dtype-based fallback
        if pd.api.types.is_datetime64_any_dtype(series):
            return ColumnDecision(
                semantic_type="DATETIME",
                confidence=0.6,
                reason="Datetime dtype detected.",
                evidence=evidence,
            )
        if pd.api.types.is_numeric_dtype(series.dtype):
            return ColumnDecision(
                semantic_type="NUMERIC_CONTINUOUS",
                confidence=0.5,
                reason="Numeric dtype detected; defaulting to continuous.",
                evidence=evidence,
            )
        if pd.api.types.is_bool_dtype(series.dtype):
            return ColumnDecision(
                semantic_type="BOOLEAN",
                confidence=0.6,
                reason="Boolean dtype detected.",
                evidence=evidence,
            )
        return ColumnDecision(
            semantic_type="CATEGORICAL",
            confidence=0.3,
            reason="Defaulting to categorical.",
            evidence=evidence,
        )

    # Precedence rules when high confidence evidence exists
    # Choose best by score but enforce precedence with minimum thresholds.
    best_type = max(scores, key=scores.get)
    best_score = scores[best_type]

    # precedence gates
    if scores["BOOLEAN"] >= 0.7:
        best_type = "BOOLEAN"
        best_score = scores[best_type]
    elif scores["DATETIME"] >= 0.7:
        best_type = "DATETIME"
        best_score = scores[best_type]
    elif scores["GEOGRAPHIC"] >= 0.7:
        best_type = "GEOGRAPHIC"
        best_score = scores[best_type]
    # Strong precedence for explicit percentage name evidence; do this before IDENTIFIER
    elif scores["PERCENTAGE"] >= 0.6 and name_hits["percent"] and scores["NUMERIC_CONTINUOUS"] < scores["PERCENTAGE"]:
        best_type = "PERCENTAGE"
        best_score = scores[best_type]
    elif scores["MONETARY"] >= 0.6 and name_hits["monetary"] and scores["NUMERIC_CONTINUOUS"] < scores["MONETARY"]:
        best_type = "MONETARY"
        best_score = scores[best_type]
    elif scores["IDENTIFIER"] >= 0.7:
        best_type = "IDENTIFIER"
        best_score = scores[best_type]



    conf = float(max(0.05, min(0.99, best_score)))

    reason_map = {
        "IDENTIFIER": "High uniqueness and/or ID-like column name.",
        "CATEGORICAL": "Moderate uniqueness with repeated short values (dimension-like).",
        "NUMERIC_CONTINUOUS": "Numeric coercion succeeds with non-integer / wide value variation.",
        "NUMERIC_DISCRETE": "Numeric coercion succeeds with integer-like values (count/quantity).",
        "DATETIME": "Datetime keyword and/or high datetime parse success rate.",
        "GEOGRAPHIC": "Geographic keyword and/or lat/long-like numeric ranges.",
        "TEXT": "Object/string with long values and high uniqueness (free text-like).",
        "MONETARY": "Currency/amount keyword and/or monetary evidence in values.",
        "PERCENTAGE": "Percent/rate/attendance keyword and/or percentage evidence in values.",
        "BOOLEAN": "Boolean-like keyword and/or high yes/no true/false match rate.",
    }

    return ColumnDecision(
        semantic_type=best_type,
        confidence=conf,
        reason=reason_map.get(best_type, "") + f"(score={best_score:.2f}).",
        evidence=evidence,
    )


def classify_dataframe_columns(df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
    """Classify every column into universal semantic types."""
    if df is None or df.empty:
        return {}

    out: Dict[str, Dict[str, Any]] = {}
    for col in df.columns:
        decision = _decide_column_type(df, col)
        out[str(col)] = {
            "type": decision.semantic_type,
            "confidence": decision.confidence,
            "reason": decision.reason,
            "evidence": decision.evidence,
        }
    return out

