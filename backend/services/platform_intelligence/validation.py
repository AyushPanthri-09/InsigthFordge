from backend.services.platform_intelligence.contracts import PlatformIntelligenceResult

class PlatformValidator:
    """
    Validates explainability weights coverage and compliance scores.
    """

    @staticmethod
    def validate_platform(
        result: PlatformIntelligenceResult
    ) -> PlatformIntelligenceResult:
        """
        Runs validation checks over supervisor results.
        """
        validated = result.model_copy()
        
        # 1. Governance score validation check
        if validated.overall_governance_score < 70.0:
            validated.overall_validation_status = "warning"
            validated.global_limitations.append("Governance Alert: compliance audit score is below target threshold.")

        # 2. Explainability features completeness check
        if not validated.explainability_report.feature_attributions:
            validated.overall_validation_status = "warning"
            validated.global_limitations.append("Explainability Alert: feature attributions dictionary is empty.")

        return validated
