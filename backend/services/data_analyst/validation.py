import pandas as pd
from typing import List, Dict, Any
from backend.services.data_analyst.contracts import (
    AnalystResult,
    ConfidenceBreakdown,
    KPIResult,
    Insight,
    AnomalyResult,
    ForecastResult,
    TrendResult
)
from backend.services.data_engineer.contracts import TrustedDataset

class DataAnalystValidator:
    """
    Validation Layer for the AI Data Analyst.
    Challenges Phase 2 quality scores and enforces Phase 3 Scientific Validation Gates.
    """

    @staticmethod
    def challenge_data_engineer(trusted_dataset: TrustedDataset) -> Dict[str, Any]:
        """
        Challenges the Data Engineer's certified outputs.
        Determines baseline confidences and limitations based on dataset health.
        """
        quality_report = trusted_dataset.quality_report
        trust_score = quality_report.quality_score.trust_score
        
        # 1. Propagate data quality confidence
        # Capped/scaled relative to overall dataset trust score
        data_quality_confidence = float(trust_score / 100.0)
        
        global_limitations = []
        if trust_score < 70:
            global_limitations.append(f"Low dataset trust score ({trust_score:.1f}/100) downgrades overall analytical confidence.")

        # 2. Check column missingness and quality issues
        column_limitations = {}
        for issue in quality_report.issues:
            if issue.id.startswith("val_excessive_nulls_") and issue.column:
                col = issue.column
                column_limitations[col] = ["high missingness"]
                global_limitations.append(f"Column '{col}' has high missingness, which may bias statistical conclusions.")

        return {
            "data_quality_confidence": data_quality_confidence,
            "global_limitations": global_limitations,
            "column_limitations": column_limitations
        }

    @staticmethod
    def enforce_final_validation_gates(result: AnalystResult) -> AnalystResult:
        """
        Final Validation Gate.
        Checks that every result is traceable, has evidence, and meets safety rules.
        """
        # Copy result to mutate validation statuses if needed
        validated = result.model_copy()
        
        # Verify overall status
        overall_status = "valid"
        
        # 1. Every KPI has evidence
        for kpi in validated.kpis:
            if not kpi.evidence_ids:
                kpi.validation_status = "invalid"
                kpi.limitations.append("Missing supporting evidence chain.")
                overall_status = "warning"

        # 2. Every insight has statistical validation
        for insight in validated.insights:
            if not insight.statistical_validation or insight.statistical_validation == "":
                insight.validation_status = "invalid"
                insight.limitations.append("No statistical test validation found for this insight.")
                overall_status = "warning"

        # 3. Every anomaly has explanation or standard fallback
        for anomaly in validated.anomalies:
            if not anomaly.explanation or anomaly.explanation.strip() == "":
                anomaly.explanation = "No statistically reliable explanation can be determined."
                anomaly.validation_status = "warning"
            elif "No statistically reliable explanation can be determined" in anomaly.explanation:
                anomaly.validation_status = "warning"

        # 4. Every forecast includes assumptions and limitations
        for forecast in validated.forecasts:
            if not forecast.assumptions:
                forecast.assumptions = ["Normal distribution of residuals assumed."]
                forecast.validation_status = "warning"
            if not forecast.limitations:
                forecast.limitations.append("Assumes stationary historical variance; projections may drift.")
                forecast.validation_status = "warning"

        # 5. Every trend includes direction and confidence
        for trend in validated.trends:
            if trend.confidence_breakdown.overall_confidence == 0.0:
                trend.validation_status = "warning"
                trend.limitations.append("Zero computed statistical significance for this trend.")

        # 6. Check that every conclusion has non-empty evidence IDs
        all_objects = (
            validated.kpis +
            validated.statistical_tests +
            validated.trends +
            validated.forecasts +
            validated.segments +
            validated.anomalies +
            validated.insights +
            validated.questions
        )
        
        for obj in all_objects:
            if not obj.evidence_ids:
                obj.validation_status = "warning"
                obj.limitations.append("Evidence IDs are unlinked.")

        validated.overall_validation_status = overall_status
        return validated
