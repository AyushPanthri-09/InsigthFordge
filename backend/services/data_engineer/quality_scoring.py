import pandas as pd
from typing import List, Dict, Any
from backend.services.data_engineer.contracts import QualityScore, ValidationIssue

class QualityScoringEngine:
    """
    Computes quality scores, completeness ratings, integrity metrics, and final trust indexes.
    Classifies datasets into standard certification levels (Excellent, Good, Moderate, Poor, Critical).
    """

    @staticmethod
    def compute_quality_score(
        df: pd.DataFrame,
        issues: List[ValidationIssue],
        duplicate_ratio: float
    ) -> QualityScore:
        """
        Calculates all quality scores for a given DataFrame and validation issues.
        """
        row_count, col_count = df.shape
        if row_count == 0 or col_count == 0:
            return QualityScore(
                score=0.0,
                level="Critical",
                completeness=0.0,
                integrity=0.0,
                schema_quality=0.0,
                trust_score=0.0
            )

        # 1. Completeness Score (1.0 - null_ratio)
        null_counts = [df[col].isnull().sum() for col in df.columns]
        total_cells = row_count * col_count
        total_nulls = sum(null_counts)
        completeness = float(1.0 - (total_nulls / total_cells)) if total_cells > 0 else 0.0

        # 2. Integrity Score (1.0 - duplicate_ratio - key_violations_ratio)
        # Calculate PK violations or severe schema issues
        severe_issues = sum(1 for i in issues if i.severity in ["critical", "high"])
        integrity_penalty = min(0.4, severe_issues * 0.08)
        integrity = float(max(0.0, 1.0 - duplicate_ratio - integrity_penalty))

        # 3. Schema Quality Score
        schema_issues = sum(1 for i in issues if i.id.startswith("schema_"))
        schema_quality = float(max(0.0, 1.0 - (schema_issues * 0.15)))

        # 4. Dataset Quality Score (mean of completeness, integrity, schema_quality)
        # Scaled to 0.0 - 100.0
        score = float((completeness + integrity + schema_quality) / 3.0 * 100.0)
        score = max(0.0, min(100.0, score))

        # 5. Business Trust Score (Dataset Quality Score penalized by rule violations)
        rule_violations = sum(1 for i in issues if i.id.startswith("rule_violation_"))
        trust_penalty = rule_violations * 4.5
        trust_score = float(max(40.0, score - trust_penalty))

        # Determine level based on final score
        if trust_score >= 90.0:
            level = "Excellent"
        elif trust_score >= 75.0:
            level = "Good"
        elif trust_score >= 60.0:
            level = "Moderate"
        elif trust_score >= 40.0:
            level = "Poor"
        else:
            level = "Critical"

        return QualityScore(
            score=round(score, 2),
            level=level,
            completeness=round(completeness, 4),
            integrity=round(integrity, 4),
            schema_quality=round(schema_quality, 4),
            trust_score=round(trust_score, 2)
        )
