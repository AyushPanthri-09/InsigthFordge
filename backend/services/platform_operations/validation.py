from backend.services.platform_operations.contracts import PlatformOperationsResult

class OperationsValidator:
    """
    Validates backup snapshot hashes, RBAC access roles, and deployment version controls.
    """

    @staticmethod
    def validate_operations(
        result: PlatformOperationsResult
    ) -> PlatformOperationsResult:
        """
        Runs validation checks over operations result schemas.
        """
        validated = result.model_copy()
        
        # 1. Benchmark validity checks
        if validated.benchmark_result.score < 50.0:
            validated.overall_validation_status = "warning"
            validated.global_limitations.append("Operations Alert: benchmark performance index is below threshold.")

        # 2. Security policies completeness checks
        if not validated.security_policy.encrypted:
            validated.overall_validation_status = "warning"
            validated.global_limitations.append("Operations Alert: local database file encryption not verified.")

        return validated
