from typing import Dict
from backend.services.orchestrator.contracts import OrchestratorResult
from backend.services.platform_intelligence.contracts import ExplainabilityReport, ConfidenceBreakdown

class ExplainabilityEngine:
    """
    Computes local feature attributions and decision logic explainability mappings.
    """

    @staticmethod
    def generate_explainability(
        orchestrator_result: OrchestratorResult,
        dq_conf: float
    ) -> ExplainabilityReport:
        """
        Approximates feature importance weights using column variance.
        """
        df = orchestrator_result.dataframe
        attributions = {}
        decision_map = {}

        if df is not None and not df.empty:
            # Map numeric columns to simple variance indicators
            num_cols = df.select_dtypes(include=["number"]).columns
            for col in num_cols:
                std_val = float(df[col].std())
                # Normalize standard deviation as proxy weight
                attributions[col] = max(0.01, min(1.0, std_val / (df[col].mean() + 1e-5)))

            # Decision Logic Explainability
            decision_map["prioritization_rule"] = "Score = 35% ROI + 35% Confidence + 20% Timeline Ease + 10% Horizon"
            decision_map["validation_gate"] = "Recommendations filtered out if overall confidence < 60%."
        else:
            attributions["dataset_size"] = 1.0
            decision_map["fallback"] = "No validated data records present for explainability mapping."

        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=1.0,
            business_confidence=1.0,
            overall_confidence=dq_conf * 0.9
        )

        return ExplainabilityReport(
            evidence_ids=[],
            confidence_breakdown=conf,
            reasoning_path="Generated explainability model attributions.",
            feature_attributions=attributions,
            algorithm_details="Feature importance approximated using normalized coefficient of variation.",
            decision_logic_map=decision_map
        )
